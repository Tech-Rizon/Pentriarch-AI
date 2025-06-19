'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import {
  Brain,
  Zap,
  Clock,
  DollarSign,
  Settings,
  PlayCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Cpu,
  Activity,
  BarChart3,
  Gauge,
  Star,
  Users,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
  Save,
  TestTube,
  MessageSquare,
  Sparkles,
  Target,
  Database,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Minus,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'deepseek' | 'google' | 'mistral'
  type: 'chat' | 'completion' | 'embedding'
  version: string
  context_length: number
  max_tokens: number
  cost_per_token: number
  speed_score: number
  quality_score: number
  reasoning_score: number
  coding_score: number
  available: boolean
  popular: boolean
  recommended: boolean
  description: string
  strengths: string[]
  limitations: string[]
  use_cases: string[]
}

interface ModelPerformance {
  model_id: string
  response_time: number
  success_rate: number
  total_requests: number
  avg_tokens: number
  cost_total: number
  last_used: string
  error_rate: number
  satisfaction_score: number
}

interface ModelTest {
  id: string
  model_id: string
  prompt: string
  response: string
  response_time: number
  token_count: number
  cost: number
  score: number
  created_at: string
}

interface UserPreferences {
  primary_model: string
  fallback_model: string
  auto_fallback: boolean
  budget_limit: number
  quality_threshold: number
  speed_preference: 'fast' | 'balanced' | 'quality'
  custom_prompts: Record<string, string>
  model_weights: {
    speed: number
    quality: number
    cost: number
    reliability: number
  }
}

export default function ModelSelector() {
  const [models, setModels] = useState<AIModel[]>([])
  const [performance, setPerformance] = useState<ModelPerformance[]>([])
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [tests, setTests] = useState<ModelTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('models')

  // Test modal state
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testPrompt, setTestPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [isRunningTest, setIsRunningTest] = useState(false)

  // Filter and search
  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)

  useEffect(() => {
    loadModels()
    loadPerformance()
    loadPreferences()
    loadTests()
  }, [])

  const loadModels = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/models')
      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPerformance = async () => {
    try {
      const response = await fetch('/api/models/performance')
      if (response.ok) {
        const data = await response.json()
        setPerformance(data.performance || [])
      }
    } catch (error) {
      console.error('Failed to load performance data:', error)
    }
  }

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/set-model')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences || getDefaultPreferences())
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      setPreferences(getDefaultPreferences())
    }
  }

  const loadTests = async () => {
    try {
      const response = await fetch('/api/models/tests')
      if (response.ok) {
        const data = await response.json()
        setTests(data.tests || [])
      }
    } catch (error) {
      console.error('Failed to load tests:', error)
    }
  }

  const updatePreferences = async (newPreferences: UserPreferences) => {
    try {
      const response = await fetch('/api/set-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPreferences })
      })

      if (response.ok) {
        setPreferences(newPreferences)
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
    }
  }

  const runModelTest = async () => {
    if (!testPrompt || selectedModels.length === 0) return

    try {
      setIsRunningTest(true)

      const response = await fetch('/api/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt,
          models: selectedModels
        })
      })

      if (response.ok) {
        await loadTests()
        await loadPerformance()
        setShowTestDialog(false)
        setTestPrompt('')
        setSelectedModels([])
      }
    } catch (error) {
      console.error('Failed to run model test:', error)
    } finally {
      setIsRunningTest(false)
    }
  }

  const getDefaultPreferences = (): UserPreferences => ({
    primary_model: 'claude-3.5-sonnet',
    fallback_model: 'gpt-4o',
    auto_fallback: true,
    budget_limit: 100,
    quality_threshold: 0.8,
    speed_preference: 'balanced',
    custom_prompts: {},
    model_weights: {
      speed: 25,
      quality: 40,
      cost: 20,
      reliability: 15
    }
  })

  const getProviderBadge = (provider: string) => {
    const colors = {
      openai: 'bg-green-500/20 text-green-400 border-green-500/30',
      anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      deepseek: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      google: 'bg-red-500/20 text-red-400 border-red-500/30',
      mistral: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }

    return (
      <Badge className={colors[provider as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
        {provider.toUpperCase()}
      </Badge>
    )
  }

  const getModelScore = (model: AIModel) => {
    if (!preferences) return 0

    const { speed, quality, cost, reliability } = preferences.model_weights
    const totalWeight = speed + quality + cost + reliability

    const speedScore = model.speed_score / 100
    const qualityScore = model.quality_score / 100
    const costScore = (1 - model.cost_per_token / 0.1) // Normalize cost (lower is better)
    const reliabilityScore = 0.95 // Assume high reliability for all models

    return Math.round(
      ((speedScore * speed) +
       (qualityScore * quality) +
       (costScore * cost) +
       (reliabilityScore * reliability)) * 100 / totalWeight
    )
  }

  const getPerformanceData = (modelId: string) => {
    return performance.find(p => p.model_id === modelId) || {
      model_id: modelId,
      response_time: 0,
      success_rate: 0,
      total_requests: 0,
      avg_tokens: 0,
      cost_total: 0,
      last_used: '',
      error_rate: 0,
      satisfaction_score: 0
    }
  }

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProvider = providerFilter === 'all' || model.provider === providerFilter
    const isAvailable = !showOnlyAvailable || model.available

    return matchesSearch && matchesProvider && isAvailable
  })

  const popularModels = models.filter(m => m.popular).slice(0, 3)
  const recommendedModels = models.filter(m => m.recommended).slice(0, 3)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading AI models...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">AI Model Selector</h1>
              <p className="text-slate-400">
                Choose and configure AI models for optimal performance
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Models
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Test AI Models</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Compare model responses to your prompt
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-prompt">Test Prompt</Label>
                    <Textarea
                      id="test-prompt"
                      placeholder="Enter a prompt to test the models..."
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Select Models to Test</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {models.filter(m => m.available).map(model => (
                        <label key={model.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedModels.includes(model.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedModels([...selectedModels, model.id])
                              } else {
                                setSelectedModels(selectedModels.filter(id => id !== model.id))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{model.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setShowTestDialog(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={runModelTest}
                    disabled={!testPrompt || selectedModels.length === 0 || isRunningTest}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isRunningTest && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Run Test
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={loadModels}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {preferences && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Primary Model</p>
                    <p className="text-lg font-bold text-white">
                      {models.find(m => m.id === preferences.primary_model)?.name || 'Not Set'}
                    </p>
                  </div>
                  <Brain className="h-8 w-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Monthly Budget</p>
                    <p className="text-lg font-bold text-white">${preferences.budget_limit}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Requests</p>
                    <p className="text-lg font-bold text-white">
                      {performance.reduce((sum, p) => sum + p.total_requests, 0)}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Avg Response Time</p>
                    <p className="text-lg font-bold text-white">
                      {Math.round(performance.reduce((sum, p) => sum + p.response_time, 0) / Math.max(performance.length, 1))}ms
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="models" className="data-[state=active]:bg-emerald-600">
              <Database className="h-4 w-4 mr-2" />
              Models
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-emerald-600">
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="tests" className="data-[state=active]:bg-emerald-600">
              <TestTube className="h-4 w-4 mr-2" />
              Tests ({tests.length})
            </TabsTrigger>
          </TabsList>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6">
            {/* Quick Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Star className="h-5 w-5 mr-2 text-yellow-400" />
                    Popular Models
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {popularModels.map(model => (
                      <div key={model.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{model.name}</p>
                          <p className="text-sm text-slate-400">{model.provider}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            {getModelScore(model)}%
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => preferences && updatePreferences({
                              ...preferences,
                              primary_model: model.id
                            })}
                            className="border-slate-600 text-slate-300"
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-emerald-400" />
                    Recommended
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendedModels.map(model => (
                      <div key={model.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{model.name}</p>
                          <p className="text-sm text-slate-400">{model.provider}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            {getModelScore(model)}%
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => preferences && updatePreferences({
                              ...preferences,
                              primary_model: model.id
                            })}
                            className="border-slate-600 text-slate-300"
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-64">
                    <Input
                      placeholder="Search models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Providers</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="mistral">Mistral</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showOnlyAvailable}
                      onCheckedChange={setShowOnlyAvailable}
                    />
                    <Label htmlFor="available-only" className="text-slate-300">Available only</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Models Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredModels.map(model => {
                const perf = getPerformanceData(model.id)
                const score = getModelScore(model)
                const isSelected = preferences?.primary_model === model.id

                return (
                  <Card
                    key={model.id}
                    className={`bg-slate-800/50 border-slate-700 transition-all hover:bg-slate-800/70 ${
                      isSelected ? 'ring-2 ring-emerald-400' : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-white">{model.name}</CardTitle>
                            {isSelected && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Primary</Badge>}
                            {model.popular && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Popular</Badge>}
                            {model.recommended && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Recommended</Badge>}
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            {getProviderBadge(model.provider)}
                            <Badge variant="outline">{model.version}</Badge>
                          </div>
                          <p className="text-slate-400 text-sm">{model.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-400">{score}%</div>
                          <div className="text-sm text-slate-400">Match Score</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400 text-sm">Speed</span>
                              <span className="text-white text-sm">{model.speed_score}/100</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-blue-400 h-1.5 rounded-full"
                                style={{ width: `${model.speed_score}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400 text-sm">Quality</span>
                              <span className="text-white text-sm">{model.quality_score}/100</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-emerald-400 h-1.5 rounded-full"
                                style={{ width: `${model.quality_score}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400 text-sm">Reasoning</span>
                              <span className="text-white text-sm">{model.reasoning_score}/100</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-purple-400 h-1.5 rounded-full"
                                style={{ width: `${model.reasoning_score}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400 text-sm">Coding</span>
                              <span className="text-white text-sm">{model.coding_score}/100</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-yellow-400 h-1.5 rounded-full"
                                style={{ width: `${model.coding_score}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Model Stats */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Context:</span>
                            <span className="text-white ml-2">{model.context_length.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Max Tokens:</span>
                            <span className="text-white ml-2">{model.max_tokens.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Cost:</span>
                            <span className="text-white ml-2">${model.cost_per_token.toFixed(4)}/token</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Requests:</span>
                            <span className="text-white ml-2">{perf.total_requests}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => preferences && updatePreferences({
                              ...preferences,
                              primary_model: model.id
                            })}
                            disabled={!model.available}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isSelected ? <CheckCircle className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                            {isSelected ? 'Selected' : 'Select'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300"
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Time Chart */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Response Times</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performance.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="model_id"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="response_time" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Success Rate Chart */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Success Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performance.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="model_id"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#9ca3af" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="success_rate" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Performance Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Detailed Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-300 p-2">Model</th>
                        <th className="text-left text-slate-300 p-2">Response Time</th>
                        <th className="text-left text-slate-300 p-2">Success Rate</th>
                        <th className="text-left text-slate-300 p-2">Total Requests</th>
                        <th className="text-left text-slate-300 p-2">Total Cost</th>
                        <th className="text-left text-slate-300 p-2">Satisfaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.map(perf => {
                        const model = models.find(m => m.id === perf.model_id)
                        return (
                          <tr key={perf.model_id} className="border-b border-slate-700/50">
                            <td className="p-2">
                              <div>
                                <p className="text-white font-medium">{model?.name || perf.model_id}</p>
                                <p className="text-slate-400 text-sm">{model?.provider}</p>
                              </div>
                            </td>
                            <td className="p-2 text-white">{perf.response_time}ms</td>
                            <td className="p-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-white">{perf.success_rate.toFixed(1)}%</span>
                                <div className="w-16 bg-slate-700 rounded-full h-2">
                                  <div
                                    className="bg-emerald-400 h-2 rounded-full"
                                    style={{ width: `${perf.success_rate}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-white">{perf.total_requests.toLocaleString()}</td>
                            <td className="p-2 text-white">${perf.cost_total.toFixed(2)}</td>
                            <td className="p-2">
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= perf.satisfaction_score
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {preferences && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Primary Settings */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Model Selection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="primary-model" className="text-slate-300">Primary Model</Label>
                      <Select
                        value={preferences.primary_model}
                        onValueChange={(value) => updatePreferences({
                          ...preferences,
                          primary_model: value
                        })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {models.filter(m => m.available).map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({model.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fallback-model" className="text-slate-300">Fallback Model</Label>
                      <Select
                        value={preferences.fallback_model}
                        onValueChange={(value) => updatePreferences({
                          ...preferences,
                          fallback_model: value
                        })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {models.filter(m => m.available && m.id !== preferences.primary_model).map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({model.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-fallback" className="text-slate-300">Auto Fallback</Label>
                      <Switch
                        id="auto-fallback"
                        checked={preferences.auto_fallback}
                        onCheckedChange={(checked) => updatePreferences({
                          ...preferences,
                          auto_fallback: checked
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Budget & Quality */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Budget & Quality</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-slate-300">Monthly Budget: ${preferences.budget_limit}</Label>
                      <Slider
                        value={[preferences.budget_limit]}
                        onValueChange={(value) => updatePreferences({
                          ...preferences,
                          budget_limit: value[0]
                        })}
                        max={1000}
                        step={10}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300">Quality Threshold: {(preferences.quality_threshold * 100).toFixed(0)}%</Label>
                      <Slider
                        value={[preferences.quality_threshold * 100]}
                        onValueChange={(value) => updatePreferences({
                          ...preferences,
                          quality_threshold: value[0] / 100
                        })}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="speed-preference" className="text-slate-300">Speed Preference</Label>
                      <Select
                        value={preferences.speed_preference}
                        onValueChange={(value: 'fast' | 'balanced' | 'quality') => updatePreferences({
                          ...preferences,
                          speed_preference: value
                        })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="fast">Fast</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="quality">Quality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Model Weights */}
                <Card className="bg-slate-800/50 border-slate-700 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white">Model Selection Criteria</CardTitle>
                    <CardDescription className="text-slate-400">
                      Adjust the importance of different factors when ranking models
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-300">Speed: {preferences.model_weights.speed}%</Label>
                          <Slider
                            value={[preferences.model_weights.speed]}
                            onValueChange={(value) => updatePreferences({
                              ...preferences,
                              model_weights: { ...preferences.model_weights, speed: value[0] }
                            })}
                            max={100}
                            step={5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-slate-300">Quality: {preferences.model_weights.quality}%</Label>
                          <Slider
                            value={[preferences.model_weights.quality]}
                            onValueChange={(value) => updatePreferences({
                              ...preferences,
                              model_weights: { ...preferences.model_weights, quality: value[0] }
                            })}
                            max={100}
                            step={5}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-300">Cost: {preferences.model_weights.cost}%</Label>
                          <Slider
                            value={[preferences.model_weights.cost]}
                            onValueChange={(value) => updatePreferences({
                              ...preferences,
                              model_weights: { ...preferences.model_weights, cost: value[0] }
                            })}
                            max={100}
                            step={5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-slate-300">Reliability: {preferences.model_weights.reliability}%</Label>
                          <Slider
                            value={[preferences.model_weights.reliability]}
                            onValueChange={(value) => updatePreferences({
                              ...preferences,
                              model_weights: { ...preferences.model_weights, reliability: value[0] }
                            })}
                            max={100}
                            step={5}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={() => updatePreferences(preferences)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-6">
            <div className="space-y-4">
              {tests.length > 0 ? (
                tests.map(test => (
                  <Card key={test.id} className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            {models.find(m => m.id === test.model_id)?.name || test.model_id}
                          </CardTitle>
                          <p className="text-slate-400 text-sm">{format(new Date(test.created_at), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold">{test.score}/100</p>
                            <p className="text-slate-400 text-sm">Score</p>
                          </div>
                          <div className="text-right">
                            <p className="text-blue-400 font-bold">{test.response_time}ms</p>
                            <p className="text-slate-400 text-sm">Response</p>
                          </div>
                          <div className="text-right">
                            <p className="text-yellow-400 font-bold">${test.cost.toFixed(4)}</p>
                            <p className="text-slate-400 text-sm">Cost</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-white font-medium mb-2">Prompt</h4>
                          <p className="text-slate-300 bg-slate-700/30 p-3 rounded-lg">{test.prompt}</p>
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-2">Response</h4>
                          <p className="text-slate-300 bg-slate-700/30 p-3 rounded-lg">{test.response}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="text-center py-16">
                    <TestTube className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Tests Yet</h3>
                    <p className="text-slate-400 mb-4">
                      Run model tests to compare performance and responses
                    </p>
                    <Button
                      onClick={() => setShowTestDialog(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Run Your First Test
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
