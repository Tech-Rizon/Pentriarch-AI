// MCP Router - Model Control Protocol for intelligent AI model selection and routing
// Manages multiple AI providers (OpenAI, Anthropic, DeepSeek) with fallback logic

export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'deepseek'
  contextWindow: number
  costPer1kTokens: number
  capabilities: string[]
  available: boolean
  performance: {
    latency: number
    reliability: number
    accuracy: number
  }
}

interface ModelSelection {
  id: string
  name: string
  reasoning: string
  confidence: number
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    costPer1kTokens: 0.03,
    capabilities: ['reasoning', 'analysis', 'code', 'security'],
    available: true,
    performance: { latency: 2.5, reliability: 98, accuracy: 95 }
  },
  {
    id: 'gpt-4-mini',
    name: 'GPT-4 Mini',
    provider: 'openai',
    contextWindow: 16384,
    costPer1kTokens: 0.0015,
    capabilities: ['reasoning', 'analysis', 'quick_tasks'],
    available: true,
    performance: { latency: 1.2, reliability: 99, accuracy: 90 }
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1kTokens: 0.015,
    capabilities: ['reasoning', 'analysis', 'safety', 'compliance'],
    available: true,
    performance: { latency: 1.8, reliability: 99, accuracy: 96 }
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1kTokens: 0.00025,
    capabilities: ['quick_tasks', 'analysis'],
    available: true,
    performance: { latency: 0.8, reliability: 99, accuracy: 88 }
  },
  {
    id: 'deepseek-v2',
    name: 'DeepSeek V2',
    provider: 'deepseek',
    contextWindow: 128000,
    costPer1kTokens: 0.001,
    capabilities: ['reasoning', 'code', 'technical_analysis'],
    available: true,
    performance: { latency: 1.5, reliability: 97, accuracy: 93 }
  }
]

export class MCPRouter {
  private apiKeys: Record<string, string> = {}
  private fallbackOrder: string[] = ['gpt-4-mini', 'claude-3-haiku', 'deepseek-v2']

  constructor() {
    this.loadApiKeys()
  }

  private loadApiKeys() {
    this.apiKeys = {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || ''
    }
  }

  /**
   * Select optimal model based on prompt complexity and requirements
   */
  selectOptimalModel(
    prompt: string,
    preferredModel?: string,
    userPlan: 'free' | 'pro' | 'enterprise' = 'free'
  ): ModelSelection {
    // Apply plan restrictions
    let availableModels = AI_MODELS.filter(model => model.available)

    if (userPlan === 'free') {
      availableModels = availableModels.filter(model =>
        ['gpt-4-mini', 'claude-3-haiku'].includes(model.id)
      )
    } else if (userPlan === 'pro') {
      availableModels = availableModels.filter(model => model.id !== 'deepseek-v2')
    }

    // If preferred model is available and allowed, use it
    if (preferredModel) {
      const preferred = availableModels.find(m => m.id === preferredModel)
      if (preferred) {
        return {
          id: preferred.id,
          name: preferred.name,
          reasoning: 'User preference',
          confidence: 1.0
        }
      }
    }

    // Analyze prompt complexity
    const complexity = this.analyzePromptComplexity(prompt)
    const requirements = this.extractRequirements(prompt)

    // Score models based on suitability
    const scoredModels = availableModels.map(model => ({
      model,
      score: this.scoreModel(model, complexity, requirements, userPlan)
    })).sort((a, b) => b.score - a.score)

    const selected = scoredModels[0]

    return {
      id: selected.model.id,
      name: selected.model.name,
      reasoning: this.explainSelection(selected.model, complexity, requirements),
      confidence: Math.min(0.95, selected.score / 100)
    }
  }

  /**
   * Execute prompt with selected model and automatic fallback
   */
  async executePrompt(
    prompt: string,
    modelId?: string,
    systemPrompt: string | undefined
  ): Promise<{ response: string; model: string; tokens: number }> {
    const model = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0]

    try {
      const result = await this.callModel(model, prompt, systemPrompt)
      return result
    } catch (error) {
      console.error(`Model ${model.id} failed:`, (error instanceof Error ? error.message : String(error)))

      // Try fallback models
      for (const fallbackId of this.fallbackOrder) {
        if (fallbackId === modelId) continue

        const fallbackModel = AI_MODELS.find(m => m.id === fallbackId)
        if (!fallbackModel?.available) continue

        try {
          console.log(`Falling back to ${fallbackModel.name}`)
          const result = await this.callModel(fallbackModel, prompt, systemPrompt)
          return { ...result, model: `${result.model} (fallback)` }
        } catch (fallbackError) {
          console.error(`Fallback ${fallbackModel.id} failed:`, (fallbackError instanceof Error ? fallbackError.message : String(fallbackError)))
        }
      }

      throw new Error('All AI models unavailable')
    }
  }

  /**
   * Get AI analysis for vulnerability assessment
   */
  async getAnalysis(prompt: string, modelId?: string): Promise<string> {
    try {
      const result = await this.executePrompt(prompt, modelId)
      return result.response
    } catch (error) {
      console.error('AI analysis failed:', error)
      return 'AI analysis temporarily unavailable. Using fallback analysis.'
    }
  }

  private async callModel(
    model: AIModel,
    prompt: string,
    systemPrompt: string | undefined
  ): Promise<{ response: string; model: string; tokens: number }> {
    const apiKey = this.apiKeys[model.provider]
    if (!apiKey) {
      throw new Error(`No API key configured for ${model.provider}`)
    }

    switch (model.provider) {
      case 'openai':
        return this.callOpenAI(model, prompt, apiKey, systemPrompt)
      case 'anthropic':
        return this.callAnthropic(model, prompt, apiKey, systemPrompt)
      case 'deepseek':
        return this.callDeepSeek(model, prompt, apiKey, systemPrompt)
      default:
        throw new Error(`Unsupported provider: ${model.provider}`)
    }
  }

  private async callOpenAI(
    model: AIModel,
    prompt: string,
    apiKey: string,
    systemPrompt: string | undefined
  ): Promise<{ response: string; model: string; tokens: number }> {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey })

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await openai.chat.completions.create({
      model: model.id,
      messages,
      max_tokens: 2000,
      temperature: 0.1
    })

    return {
      response: response.choices[0]?.message?.content || '',
      model: model.name,
      tokens: response.usage?.total_tokens || 0
    }
  }

  private async callAnthropic(
    model: AIModel,
    prompt: string,
    apiKey: string,
    systemPrompt: string | undefined
  ): Promise<{ response: string; model: string; tokens: number }> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: model.id,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    return {
      response: response.content[0]?.type === 'text' ? response.content[0].text : '',
      model: model.name,
      tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0
    }
  }

  private async callDeepSeek(
    model: AIModel,
    prompt: string,
    apiKey: string,
    systemPrompt: string | undefined
  ): Promise<{ response: string; model: string; tokens: number }> {
    // DeepSeek uses OpenAI-compatible API
    const OpenAI = (await import('openai')).default
    const deepseek = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    })

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-coder',
      messages,
      max_tokens: 2000,
      temperature: 0.1
    })

    return {
      response: response.choices[0]?.message?.content || '',
      model: model.name,
      tokens: response.usage?.total_tokens || 0
    }
  }

  private analyzePromptComplexity(prompt: string): number {
    const indicators = {
      length: Math.min(prompt.length / 1000, 1) * 20,
      technical: (prompt.match(/\b(vulnerability|exploit|CVE|security|penetration)\b/gi) || []).length * 5,
      reasoning: (prompt.match(/\b(analyze|explain|reasoning|logic|because)\b/gi) || []).length * 3,
      coding: (prompt.match(/\b(code|function|class|variable|algorithm)\b/gi) || []).length * 4
    }

    return Math.min(100, Object.values(indicators).reduce((sum, score) => sum + score, 0))
  }

  private extractRequirements(prompt: string): string[] {
    const requirements = []

    if (prompt.toLowerCase().includes('security') || prompt.toLowerCase().includes('vulnerability')) {
      requirements.push('security')
    }
    if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('programming')) {
      requirements.push('code')
    }
    if (prompt.toLowerCase().includes('compliance') || prompt.toLowerCase().includes('regulation')) {
      requirements.push('compliance')
    }
    if (prompt.toLowerCase().includes('quick') || prompt.toLowerCase().includes('fast')) {
      requirements.push('speed')
    }

    return requirements
  }

  private scoreModel(
    model: AIModel,
    complexity: number,
    requirements: string[],
    userPlan: string
  ): number {
    let score = model.performance.accuracy

    // Complexity matching
    if (complexity > 70 && model.capabilities.includes('reasoning')) score += 20
    if (complexity < 30 && model.performance.latency < 1.5) score += 15

    // Requirement matching
    for (const req of requirements) {
      if (model.capabilities.includes(req)) score += 10
    }

    // Plan optimization
    if (userPlan === 'free' && model.costPer1kTokens < 0.002) score += 10
    if (userPlan === 'enterprise' && model.capabilities.includes('security')) score += 15

    // Performance factors
    score += (100 - model.performance.latency) / 10
    score += model.performance.reliability / 10

    return score
  }

  private explainSelection(model: AIModel, complexity: number, requirements: string[]): string {
    const reasons = []

    if (complexity > 70) {
      reasons.push('Complex prompt requires advanced reasoning capabilities')
    } else if (complexity < 30) {
      reasons.push('Simple prompt optimized for speed')
    }

    if (requirements.includes('security') && model.capabilities.includes('security')) {
      reasons.push('Model specialized for security analysis')
    }
    if (requirements.includes('speed') && model.performance.latency < 1.5) {
      reasons.push('Fast response time required')
    }
    if (model.costPer1kTokens < 0.002) {
      reasons.push('Cost-effective for high-volume usage')
    }

    return reasons.join('. ') || 'Best overall performance for this task'
  }

  /**
   * Health check for all models
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    for (const model of AI_MODELS) {
      try {
        const testResult = await this.callModel(model, 'Test', undefined)
        results[model.id] = testResult.response.length > 0
      } catch {
        results[model.id] = false
      }
    }

    return results
  }

  /**
   * Get model usage statistics
   */
  getModelStats(): {
    available_models: number
    total_models: number
    providers: string[]
    capabilities: string[]
  } {
    return {
      available_models: AI_MODELS.filter(m => m.available).length,
      total_models: AI_MODELS.length,
      providers: [...new Set(AI_MODELS.map(m => m.provider))],
      capabilities: [...new Set(AI_MODELS.flatMap(m => m.capabilities))]
    }
  }
}

// Export singleton and utilities
export const mcpRouter = new MCPRouter()

export const selectOptimalModel = (
  prompt: string,
  preferredModel?: string,
  userPlan: 'free' | 'pro' | 'enterprise' = 'free'
): ModelSelection => {
  return mcpRouter.selectOptimalModel(prompt, preferredModel, userPlan)
}

export default mcpRouter
