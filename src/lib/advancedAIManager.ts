// Advanced AI Model Management System with Dynamic Switching and Performance Optimization

import { AI_MODELS, type AIModel } from './mcpRouter'
import { type UserRole, hasPermission } from './rbac'

interface ModelPerformanceMetrics {
  modelId: string
  timestamp: number
  latency: number
  success: boolean
  errorType?: string
  tokensUsed: number
  cost: number
  userSatisfaction?: number
  contextLength: number
}

interface ModelUsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatency: number
  totalCost: number
  tokensUsed: number
  lastUsed: number
  userRating: number
}

interface AITaskContext {
  type: 'analysis' | 'scan' | 'report' | 'chat' | 'code' | 'security'
  complexity: 'low' | 'medium' | 'high' | 'critical'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  userRole: UserRole
  estimatedTokens: number
  requiresAccuracy: boolean
  timeConstraint?: number // seconds
  budgetConstraint?: number // USD
}

interface ModelRecommendation {
  model: AIModel
  confidence: number
  reasoning: string[]
  estimatedCost: number
  estimatedLatency: number
  fallbackModels: AIModel[]
}

export class AdvancedAIManager {
  private static instance: AdvancedAIManager
  private performanceHistory: ModelPerformanceMetrics[] = []
  private modelStats: Map<string, ModelUsageStats> = new Map()
  private failureHistory: Map<string, number[]> = new Map()
  private costBudgets: Map<UserRole, number> = new Map([
    ['free', 5], // $5/month
    ['pro', 50], // $50/month
    ['admin', -1] // Unlimited
  ])

  private constructor() {
    this.initializeModelStats()
    this.loadPerformanceHistory()
  }

  static getInstance(): AdvancedAIManager {
    if (!AdvancedAIManager.instance) {
      AdvancedAIManager.instance = new AdvancedAIManager()
    }
    return AdvancedAIManager.instance
  }

  /**
   * Get intelligent model recommendation based on context
   */
  async getModelRecommendation(context: AITaskContext): Promise<ModelRecommendation> {
    const availableModels = this.getAvailableModels(context.userRole)
    const rankedModels = this.rankModelsByContext(availableModels, context)
    const primaryModel = rankedModels[0]

    if (!primaryModel) {
      throw new Error('No suitable AI models available for this request')
    }

    const fallbackModels = rankedModels.slice(1, 4) // Top 3 fallbacks

    return {
      model: primaryModel.model,
      confidence: primaryModel.score,
      reasoning: primaryModel.reasoning,
      estimatedCost: this.estimateCost(primaryModel.model, context.estimatedTokens),
      estimatedLatency: this.estimateLatency(primaryModel.model, context),
      fallbackModels: fallbackModels.map(m => m.model)
    }
  }

  /**
   * Execute AI request with automatic fallback and monitoring
   */
  async executeWithFallback(
    context: AITaskContext,
    prompt: string,
    systemPrompt?: string
  ): Promise<{
    response: string
    modelUsed: string
    cost: number
    latency: number
    tokensUsed: number
    fallbacksAttempted: number
  }> {
    const recommendation = await this.getModelRecommendation(context)
    const startTime = Date.now()
    let fallbacksAttempted = 0

    // Try primary model first
    try {
      const result = await this.executeModel(
        recommendation.model,
        prompt,
        systemPrompt,
        context
      )

      this.recordSuccess(recommendation.model, result, startTime)
      return {
        ...result,
        fallbacksAttempted
      }
    } catch (primaryError) {
      console.warn(`Primary model ${recommendation.model.id} failed:`, primaryError)
      this.recordFailure(recommendation.model, primaryError as Error, startTime)
    }

    // Try fallback models
    for (const fallbackModel of recommendation.fallbackModels) {
      fallbacksAttempted++
      try {
        const result = await this.executeModel(
          fallbackModel,
          prompt,
          systemPrompt,
          context
        )

        this.recordSuccess(fallbackModel, result, startTime)
        return {
          ...result,
          fallbacksAttempted
        }
      } catch (fallbackError) {
        console.warn(`Fallback model ${fallbackModel.id} failed:`, fallbackError)
        this.recordFailure(fallbackModel, fallbackError as Error, startTime)
      }
    }

    throw new Error('All AI models failed to respond. Please try again later.')
  }

  /**
   * Get real-time model performance analytics
   */
  getModelAnalytics(): {
    modelPerformance: Array<{
      modelId: string
      performance: ModelUsageStats
      trend: 'improving' | 'stable' | 'declining'
      healthScore: number
    }>
    costAnalysis: {
      totalSpent: number
      costByModel: Record<string, number>
      costTrend: 'increasing' | 'stable' | 'decreasing'
      projectedMonthlyCost: number
    }
    reliabilityMetrics: {
      overallSuccess: number
      averageLatency: number
      topPerformingModel: string
      mostReliableModel: string
    }
  } {
    const modelPerformance = Array.from(this.modelStats.entries()).map(([modelId, stats]) => {
      const recent = this.getRecentMetrics(modelId, 24 * 60 * 60 * 1000) // Last 24 hours
      const trend = this.calculateTrend(modelId)
      const healthScore = this.calculateHealthScore(stats)

      return {
        modelId,
        performance: stats,
        trend,
        healthScore
      }
    })

    const costAnalysis = this.analyzeCosts()
    const reliabilityMetrics = this.calculateReliabilityMetrics()

    return {
      modelPerformance,
      costAnalysis,
      reliabilityMetrics
    }
  }

  /**
   * Optimize model selection based on historical performance
   */
  optimizeModelSelection(): {
    recommendations: string[]
    adjustments: Record<string, number>
    reasoning: string[]
  } {
    const analytics = this.getModelAnalytics()
    const recommendations: string[] = []
    const adjustments: Record<string, number> = {}
    const reasoning: string[] = []

    // Find underperforming models
    for (const { modelId, performance, healthScore } of analytics.modelPerformance) {
      if (healthScore < 70) {
        adjustments[modelId] = -0.2 // Reduce priority
        reasoning.push(`${modelId} health score below threshold (${healthScore}/100)`)
      } else if (healthScore > 90) {
        adjustments[modelId] = 0.1 // Increase priority
        reasoning.push(`${modelId} performing excellently (${healthScore}/100)`)
      }
    }

    // Cost optimization recommendations
    if (analytics.costAnalysis.costTrend === 'increasing') {
      recommendations.push('Consider using more cost-effective models for routine tasks')
      reasoning.push('Monthly costs trending upward')
    }

    // Performance recommendations
    const topModel = analytics.reliabilityMetrics.topPerformingModel
    recommendations.push(`Consider prioritizing ${topModel} for critical tasks`)

    return {
      recommendations,
      adjustments,
      reasoning
    }
  }

  /**
   * Get available models based on user role and permissions
   */
  private getAvailableModels(userRole: UserRole): AIModel[] {
    return AI_MODELS.filter(model => {
      if (!model.available) return false

      // Check role-based access
      if (model.capabilities.includes('premium') && !hasPermission(userRole, 'ai:premium')) {
        return false
      }

      if (model.capabilities.includes('advanced') && !hasPermission(userRole, 'ai:advanced')) {
        return false
      }

      return true
    })
  }

  /**
   * Rank models by suitability for the given context
   */
  private rankModelsByContext(
    models: AIModel[],
    context: AITaskContext
  ): Array<{ model: AIModel; score: number; reasoning: string[] }> {
    return models.map(model => {
      const reasoning: string[] = []
      let score = 50 // Base score

      // Capability matching
      const relevantCapabilities = this.getRelevantCapabilities(context.type)
      const capabilityMatch = relevantCapabilities.filter(cap =>
        model.capabilities.includes(cap)
      ).length / relevantCapabilities.length

      score += capabilityMatch * 30
      if (capabilityMatch > 0.8) {
        reasoning.push('Excellent capability match')
      }

      // Performance consideration
      const stats = this.modelStats.get(model.id)
      if (stats) {
        const successRate = stats.successfulRequests / Math.max(stats.totalRequests, 1)
        score += successRate * 20

        if (stats.averageLatency < 2) {
          score += 10
          reasoning.push('Low latency')
        }

        if (successRate > 0.95) {
          reasoning.push('High reliability')
        }
      }

      // Context-specific adjustments
      if (context.complexity === 'critical' && model.performance.accuracy > 94) {
        score += 15
        reasoning.push('High accuracy for critical task')
      }

      if (context.timeConstraint && context.timeConstraint < 10) {
        score += (5 - model.performance.latency) * 3 // Favor faster models
        reasoning.push('Optimized for speed')
      }

      // Cost consideration
      if (context.budgetConstraint) {
        const estimatedCost = this.estimateCost(model, context.estimatedTokens)
        if (estimatedCost <= context.budgetConstraint) {
          score += 10
          reasoning.push('Within budget')
        } else {
          score -= 20
          reasoning.push('Over budget')
        }
      }

      // Recent failure penalty
      const recentFailures = this.getRecentFailures(model.id)
      score -= recentFailures * 5
      if (recentFailures > 0) {
        reasoning.push(`${recentFailures} recent failures`)
      }

      return { model, score: Math.max(0, Math.min(100, score)), reasoning }
    }).sort((a, b) => b.score - a.score)
  }

  private getRelevantCapabilities(taskType: AITaskContext['type']): string[] {
    const capabilityMap: Record<AITaskContext['type'], string[]> = {
      'analysis': ['reasoning', 'analysis'],
      'scan': ['security', 'analysis'],
      'report': ['reasoning', 'analysis', 'writing'],
      'chat': ['reasoning', 'conversation'],
      'code': ['code', 'reasoning'],
      'security': ['security', 'analysis', 'reasoning']
    }

    return capabilityMap[taskType] || ['reasoning']
  }

  private async executeModel(
    model: AIModel,
    prompt: string,
    systemPrompt: string | undefined,
    context: AITaskContext
  ) {
    // This would integrate with the existing MCP Router
    // For now, return a mock response structure
    const startTime = Date.now()

    // Simulate API call with realistic timing
    await new Promise(resolve => setTimeout(resolve, model.performance.latency * 1000))

    const latency = (Date.now() - startTime) / 1000
    const tokensUsed = Math.floor(prompt.length / 4) + 100 // Rough estimate
    const cost = this.estimateCost(model, tokensUsed)

    return {
      response: `AI response from ${model.name}`,
      modelUsed: model.id,
      cost,
      latency,
      tokensUsed
    }
  }

  private estimateCost(model: AIModel, tokens: number): number {
    return (tokens / 1000) * model.costPer1kTokens
  }

  private estimateLatency(model: AIModel, context: AITaskContext): number {
    let baseLatency = model.performance.latency

    // Adjust for complexity
    if (context.complexity === 'high') baseLatency *= 1.5
    if (context.complexity === 'critical') baseLatency *= 2

    // Adjust for context length
    if (context.estimatedTokens > 4000) {
      baseLatency *= 1.2
    }

    return baseLatency
  }

  private recordSuccess(model: AIModel, result: { response: string; modelUsed: string; cost: number; latency: number; tokensUsed: number }, startTime: number) {
    const metric: ModelPerformanceMetrics = {
      modelId: model.id,
      timestamp: Date.now(),
      latency: result.latency,
      success: true,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      contextLength: 0 // Would be calculated from actual request
    }

    this.performanceHistory.push(metric)
    this.updateModelStats(model.id, metric)
  }

  private recordFailure(model: AIModel, error: Error, startTime: number) {
    const metric: ModelPerformanceMetrics = {
      modelId: model.id,
      timestamp: Date.now(),
      latency: (Date.now() - startTime) / 1000,
      success: false,
      errorType: error.name,
      tokensUsed: 0,
      cost: 0,
      contextLength: 0
    }

    this.performanceHistory.push(metric)
    this.updateModelStats(model.id, metric)
  }

  private updateModelStats(modelId: string, metric: ModelPerformanceMetrics) {
    const existing = this.modelStats.get(modelId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalCost: 0,
      tokensUsed: 0,
      lastUsed: 0,
      userRating: 0
    }

    existing.totalRequests++
    if (metric.success) {
      existing.successfulRequests++
    } else {
      existing.failedRequests++
    }

    existing.averageLatency = (existing.averageLatency * (existing.totalRequests - 1) + metric.latency) / existing.totalRequests
    existing.totalCost += metric.cost
    existing.tokensUsed += metric.tokensUsed
    existing.lastUsed = metric.timestamp

    this.modelStats.set(modelId, existing)
  }

  private initializeModelStats() {
    for (const model of AI_MODELS) {
      if (!this.modelStats.has(model.id)) {
        this.modelStats.set(model.id, {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageLatency: model.performance.latency,
          totalCost: 0,
          tokensUsed: 0,
          lastUsed: 0,
          userRating: 0
        })
      }
    }
  }

  private loadPerformanceHistory() {
    // In production, this would load from database
    // For now, initialize with empty history
    this.performanceHistory = []
  }

  private getRecentMetrics(modelId: string, timeWindow: number) {
    const cutoff = Date.now() - timeWindow
    return this.performanceHistory.filter(
      metric => metric.modelId === modelId && metric.timestamp > cutoff
    )
  }

  private calculateTrend(modelId: string): 'improving' | 'stable' | 'declining' {
    const recent = this.getRecentMetrics(modelId, 7 * 24 * 60 * 60 * 1000) // Last 7 days
    if (recent.length < 10) return 'stable'

    const halfPoint = Math.floor(recent.length / 2)
    const firstHalf = recent.slice(0, halfPoint)
    const secondHalf = recent.slice(halfPoint)

    const firstSuccess = firstHalf.filter(m => m.success).length / firstHalf.length
    const secondSuccess = secondHalf.filter(m => m.success).length / secondHalf.length

    const diff = secondSuccess - firstSuccess
    if (diff > 0.05) return 'improving'
    if (diff < -0.05) return 'declining'
    return 'stable'
  }

  private calculateHealthScore(stats: ModelUsageStats): number {
    if (stats.totalRequests === 0) return 75 // Default for unused models

    const successRate = stats.successfulRequests / stats.totalRequests
    const latencyScore = Math.max(0, 100 - stats.averageLatency * 20)
    const reliabilityScore = successRate * 100

    return Math.round((reliabilityScore * 0.6 + latencyScore * 0.4))
  }

  private analyzeCosts() {
    const totalSpent = Array.from(this.modelStats.values())
      .reduce((sum, stats) => sum + stats.totalCost, 0)

    const costByModel: Record<string, number> = {}
    this.modelStats.forEach((stats, modelId) => {
      costByModel[modelId] = stats.totalCost
    })

    // Calculate trend (simplified)
    const costTrend = totalSpent > 100 ? 'increasing' : 'stable'
    const projectedMonthlyCost = totalSpent * 30 // Rough monthly projection

    return {
      totalSpent,
      costByModel,
      costTrend: costTrend as 'increasing' | 'stable' | 'decreasing',
      projectedMonthlyCost
    }
  }

  private calculateReliabilityMetrics() {
    let totalRequests = 0
    let totalSuccess = 0
    let totalLatency = 0
    let topPerforming = { modelId: '', score: 0 }
    let mostReliable = { modelId: '', rate: 0 }

    this.modelStats.forEach((stats, modelId) => {
      totalRequests += stats.totalRequests
      totalSuccess += stats.successfulRequests
      totalLatency += stats.averageLatency * stats.totalRequests

      const healthScore = this.calculateHealthScore(stats)
      if (healthScore > topPerforming.score) {
        topPerforming = { modelId, score: healthScore }
      }

      const successRate = stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 0
      if (successRate > mostReliable.rate) {
        mostReliable = { modelId, rate: successRate }
      }
    })

    return {
      overallSuccess: totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0,
      averageLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      topPerformingModel: topPerforming.modelId || 'gpt-4-mini',
      mostReliableModel: mostReliable.modelId || 'gpt-4-mini'
    }
  }

  private getRecentFailures(modelId: string): number {
    const recent = this.getRecentMetrics(modelId, 60 * 60 * 1000) // Last hour
    return recent.filter(m => !m.success).length
  }
}

// Export singleton instance
export const advancedAIManager = AdvancedAIManager.getInstance()

// Export types for use in components
export type { AITaskContext, ModelRecommendation, ModelPerformanceMetrics }
