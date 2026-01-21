'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Brain,
  Shield,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  BarChart3,
  Lightbulb,
  FileText
} from 'lucide-react'

interface AIAnalysisResult {
  riskScore: number
  confidenceLevel: number
  threatLevel: 'critical' | 'high' | 'medium' | 'low'
  reasoning: string[]
  correlatedFindings: Array<{ id: string; title: string; description: string; severity: string }>
  remediationPlan: RemediationStep[]
  predictiveInsights: string[]
  complianceImpact: string[]
}

interface RemediationStep {
  priority: 'immediate' | 'high' | 'medium' | 'low'
  action: string
  description: string
  estimatedTime: string
  riskReduction: number
  dependencies?: string[]
}

interface AIAnalysisPanelProps {
  scanId: string
  onAnalysisComplete?: (result: AIAnalysisResult) => void
}

type AnalysisContext = {
  environment: 'production' | 'staging' | 'development' | 'unknown'
  businessCritical: boolean
  exposureLevel: 'internet' | 'internal' | 'isolated'
}

export function AIAnalysisPanel({ scanId, onAnalysisComplete }: AIAnalysisPanelProps) {
  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [analysisType, setAnalysisType] = useState<'full' | 'risk_only' | 'remediation_only' | 'predictive_only'>('full')
  const [context, setContext] = useState<AnalysisContext>({
    environment: 'production',
    businessCritical: true,
    exposureLevel: 'internet'
  })
  const [error, setError] = useState<string | null>(null)

  const performAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanId,
          context,
          analysisType
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setAnalysisResult(data.aiAnalysis)
        onAnalysisComplete?.(data.aiAnalysis)
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'immediate': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-xl">🤖 Advanced AI Vulnerability Analysis</CardTitle>
          </div>
          <CardDescription>
            Multi-step reasoning engine with intelligent remediation and predictive insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Analysis Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Analysis Type</label>
              <Select value={analysisType} onValueChange={(value: string) => setAnalysisType(value as typeof analysisType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">🧠 Complete AI Analysis</SelectItem>
                  <SelectItem value="risk_only">⚠️ Risk Assessment Only</SelectItem>
                  <SelectItem value="remediation_only">🔧 Remediation Planning</SelectItem>
                  <SelectItem value="predictive_only">🔮 Predictive Insights</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Environment</label>
              <Select value={context.environment} onValueChange={(value: string) => setContext(prev => ({ ...prev, environment: value as 'production' | 'staging' | 'development' | 'unknown' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">🏭 Production</SelectItem>
                  <SelectItem value="staging">🧪 Staging</SelectItem>
                  <SelectItem value="development">💻 Development</SelectItem>
                  <SelectItem value="unknown">❓ Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Exposure Level</label>
              <Select value={context.exposureLevel} onValueChange={(value: string) => setContext(prev => ({ ...prev, exposureLevel: value as 'internet' | 'internal' | 'isolated' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internet">🌐 Internet-facing</SelectItem>
                  <SelectItem value="internal">🏢 Internal Network</SelectItem>
                  <SelectItem value="isolated">🔒 Isolated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={performAnalysis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-spin" />
                Running AI Analysis...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="reasoning">🧠 Reasoning</TabsTrigger>
            <TabsTrigger value="remediation">🔧 Remediation</TabsTrigger>
            <TabsTrigger value="predictions">🔮 Predictions</TabsTrigger>
            <TabsTrigger value="compliance">📋 Compliance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Risk Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysisResult.riskScore}/100</div>
                  <Progress value={analysisResult.riskScore} className="mt-2" />
                  <Badge
                    className={`mt-2 ${getThreatLevelColor(analysisResult.threatLevel)} text-white`}
                  >
                    {analysisResult.threatLevel.toUpperCase()} THREAT
                  </Badge>
                </CardContent>
              </Card>

              {/* Confidence Level */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysisResult.confidenceLevel}%</div>
                  <Progress value={analysisResult.confidenceLevel} className="mt-2" />
                  <div className="text-sm text-muted-foreground mt-1">
                    Analysis reliability
                  </div>
                </CardContent>
              </Card>

              {/* Findings Count */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Correlated Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysisResult.correlatedFindings.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Prioritized by AI
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reasoning Tab */}
          <TabsContent value="reasoning" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Multi-step Reasoning Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered logical analysis of vulnerability chains and attack paths
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.reasoning.map((step, index) => (
                    <div key={`reasoning-${index}-${step.slice(0, 20)}`} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Remediation Tab */}
          <TabsContent value="remediation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Intelligent Remediation Plan
                </CardTitle>
                <CardDescription>
                  Priority-based action plan with dependency mapping and risk reduction estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.remediationPlan.map((step, index) => (
                    <div key={`remediation-${index}-${step.action.slice(0, 15)}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(step.priority)}>
                            {step.priority.toUpperCase()} PRIORITY
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {step.estimatedTime}
                          </div>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          -{step.riskReduction}% risk
                        </div>
                      </div>
                      <h4 className="font-semibold">{step.action}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      {step.dependencies && step.dependencies.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Dependencies: </span>
                          <span className="text-xs">{step.dependencies.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Predictive Vulnerability Insights
                </CardTitle>
                <CardDescription>
                  ML-based predictions of additional vulnerabilities and security gaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.predictiveInsights.map((insight, index) => (
                    <div key={`insight-${index}-${insight.slice(0, 20)}`} className="flex gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Compliance Impact Assessment
                </CardTitle>
                <CardDescription>
                  Automated mapping to regulatory frameworks and compliance requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.complianceImpact.map((impact, index) => (
                    <div key={`compliance-${index}-${impact.slice(0, 20)}`} className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{impact}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
