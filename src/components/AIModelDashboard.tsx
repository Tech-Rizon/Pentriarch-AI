'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Brain,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Cpu,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react'
import { advancedAIManager, type AITaskContext, type ModelRecommendation } from '@/lib/advancedAIManager'
import { AI_MODELS } from '@/lib/mcpRouter'
import type { UserRole } from '@/lib/rbac'

interface ModelPerformanceData {
  modelId: string
  performance: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageLatency: number
    totalCost: number
    tokensUsed: number
    lastUsed: number
    userRating: number
  }
  trend: 'improving' | 'stable' | 'declining'
  healthScore: number
}

export default function AIModelDashboard() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4-mini')
  const [autoOptimize, setAutoOptimize] = useState(true)
  const [realTimeMode, setRealTimeMode] = useState(false)
  const [recommendations, setRecommendations] = useState<ModelRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [taskContext, setTaskContext] = useState<AITaskContext>({
    type: 'analysis',
    complexity: 'medium',
    priority: 'normal',
    userRole: 'pro' as UserRole,
    estimatedTokens: 1000,
    requiresAccuracy: true
  })

  useEffect(() => {
    loadAnalytics()
    getModelRecommendation()

    if (realTimeMode) {
      const interval = setInterval(loadAnalytics, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [realTimeMode, taskContext])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const data = advancedAIManager.getModelAnalytics()
      setAnalytics(data)

      if (autoOptimize) {
        const optimization = advancedAIManager.optimizeModelSelection()
        console.log('Optimization recommendations:', optimization)
      }
    } catch (error: unknown) {
      setError(`Failed to load analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getModelRecommendation = async () => {
    try {
      const rec = await advancedAIManager.getModelRecommendation(taskContext)
      setRecommendations(rec)
    } catch (error: unknown) {
      console.error('Failed to get recommendations:', error)
    }
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-blue-500" />
    }
  }

  const getHealthBadge = (healthScore: number) => {
    if (healthScore >= 90) return <Badge className="bg-green-100 text-green-700">Excellent</Badge>
    if (healthScore >= 75) return <Badge className="bg-blue-100 text-blue-700">Good</Badge>
    if (healthScore >= 60) return <Badge className="bg-yellow-100 text-yellow-700">Fair</Badge>
    return <Badge className="bg-red-100 text-red-700">Poor</Badge>
  }

  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading AI model analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Model Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor performance, costs, and optimize AI model selection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="realtime"
              checked={realTimeMode}
              onCheckedChange={setRealTimeMode}
            />
            <label htmlFor="realtime" className="text-sm font-medium">
              Real-time updates
            </label>
          </div>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.reliabilityMetrics.overallSuccess.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.reliabilityMetrics.averageLatency.toFixed(1)}s</p>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">${analytics.costAnalysis.totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <Brain className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.reliabilityMetrics.topPerformingModel}</p>
                  <p className="text-xs text-muted-foreground">Top Model</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Smart Recommendations</TabsTrigger>
          <TabsTrigger value="settings">Model Settings</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Model Performance Analytics
              </CardTitle>
              <CardDescription>
                Real-time performance metrics for all AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.modelPerformance && (
                <div className="space-y-4">
                  {analytics.modelPerformance.map((modelData: ModelPerformanceData) => {
                    const model = AI_MODELS.find(m => m.id === modelData.modelId)
                    if (!model) return null

                    return (
                      <div key={modelData.modelId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <div>
                              <h4 className="font-semibold">{model.name}</h4>
                              <p className="text-sm text-muted-foreground">{model.provider}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(modelData.trend)}
                            {getHealthBadge(modelData.healthScore)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium">Requests</p>
                            <p className="text-2xl font-bold">{modelData.performance.totalRequests}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Success Rate</p>
                            <p className="text-2xl font-bold">
                              {modelData.performance.totalRequests > 0
                                ? ((modelData.performance.successfulRequests / modelData.performance.totalRequests) * 100).toFixed(1)
                                : 0
                              }%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Avg Latency</p>
                            <p className="text-2xl font-bold">{modelData.performance.averageLatency.toFixed(1)}s</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Cost</p>
                            <p className="text-2xl font-bold">${modelData.performance.totalCost.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Health Score</span>
                            <span>{modelData.healthScore}/100</span>
                          </div>
                          <Progress value={modelData.healthScore} className="h-2" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.costAnalysis && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Spent</span>
                        <span className="font-bold">${analytics.costAnalysis.totalSpent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Projected Monthly</span>
                        <span className="font-bold">${analytics.costAnalysis.projectedMonthlyCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost Trend</span>
                        <Badge variant={analytics.costAnalysis.costTrend === 'increasing' ? 'destructive' : 'default'}>
                          {analytics.costAnalysis.costTrend}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Cost by Model</h4>
                      {Object.entries(analytics.costAnalysis.costByModel).map(([modelId, cost]) => {
                        const model = AI_MODELS.find(m => m.id === modelId)
                        return (
                          <div key={modelId} className="flex justify-between">
                            <span>{model?.name || modelId}</span>
                            <span>${(cost as number).toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Usage Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Auto-optimize model selection</span>
                    <Switch
                      checked={autoOptimize}
                      onCheckedChange={setAutoOptimize}
                    />
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Optimization Tips</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Use GPT-4 Mini for routine tasks to reduce costs</li>
                      <li>• Claude 3 Sonnet excels at analysis tasks</li>
                      <li>• DeepSeek Coder is most cost-effective for code generation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Smart Model Selection
                </CardTitle>
                <CardDescription>
                  Get AI-powered recommendations for your specific task
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Task Type</label>
                    <Select
                      value={taskContext.type}
                      onValueChange={(value) => setTaskContext({...taskContext, type: value as 'analysis' | 'scan' | 'report' | 'chat' | 'code' | 'security'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analysis">Analysis</SelectItem>
                        <SelectItem value="scan">Security Scan</SelectItem>
                        <SelectItem value="report">Report Generation</SelectItem>
                        <SelectItem value="chat">Chat/Conversation</SelectItem>
                        <SelectItem value="code">Code Generation</SelectItem>
                        <SelectItem value="security">Security Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complexity</label>
                    <Select
                      value={taskContext.complexity}
                      onValueChange={(value) => setTaskContext({...taskContext, complexity: value as 'low' | 'medium' | 'high' | 'critical'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={getModelRecommendation} className="w-full">
                  <Brain className="w-4 h-4 mr-2" />
                  Get Recommendation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Model</CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{recommendations.model.name}</h4>
                      <Badge variant="secondary">
                        {Math.round(recommendations.confidence)}% confidence
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Est. Cost:</span>
                        <p className="font-semibold">${recommendations.estimatedCost.toFixed(4)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Latency:</span>
                        <p className="font-semibold">{recommendations.estimatedLatency.toFixed(1)}s</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Reasoning:</span>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {recommendations.reasoning.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Fallback Models:</span>
                      <div className="flex gap-2 mt-1">
                        {recommendations.fallbackModels.slice(0, 3).map((model) => (
                          <Badge key={model.id} variant="outline">
                            {model.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Select task parameters and click "Get Recommendation"</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Model Configuration
              </CardTitle>
              <CardDescription>
                Configure AI model preferences and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Automatic Fallback</p>
                    <p className="text-sm text-muted-foreground">Automatically switch to backup models on failure</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Performance Monitoring</p>
                    <p className="text-sm text-muted-foreground">Track and analyze model performance</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cost Optimization</p>
                    <p className="text-sm text-muted-foreground">Prefer cost-effective models when possible</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.filter(m => m.available).map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} - {model.provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
