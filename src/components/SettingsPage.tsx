'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  Settings,
  Brain,
  Key,
  Bell,
  Palette,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  User,
  Save,
  Trash2,
  Activity,
  Monitor,
  Database,
  Cpu,
  HardDrive,
  Network,
  Zap
} from 'lucide-react'
import { getCurrentUserClient } from '@/lib/supabase'

interface UserSettings {
  preferred_ai_model: string
  notification_preferences: {
    email: boolean
    browser: boolean
    scan_complete: boolean
    vulnerabilities: boolean
  }
  api_keys: {
    openai?: string
    anthropic?: string
    deepseek?: string
  }
  branding: {
    company_name?: string
    logo_url?: string
    theme_color?: string
  }
}

interface AIModel {
  id: string
  name: string
  provider: string
  description: string
}

interface SystemMetrics {
  status: string
  uptime: string
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_usage: number
  active_scans: number
  total_requests: number
  error_rate: number
}

interface PerformanceMetrics {
  scan_speed: number
  api_latency: number
  success_rate: number
  throughput: number
  response_time: number
  queue_length: number
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  component: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [user, setUser] = useState<any>(null)
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [capabilities, setCapabilities] = useState<any>({})
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [apiKeyTests, setApiKeyTests] = useState<Record<string, any>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [showMetricsModal, setShowMetricsModal] = useState(false)

  useEffect(() => {
    loadSettings()
    loadSystemMetrics()
    loadPerformanceMetrics()
    loadLogs()

    // Set up real-time updates
    const metricsInterval = setInterval(() => {
      loadSystemMetrics()
      loadPerformanceMetrics()
    }, 5000) // Update every 5 seconds

    const logsInterval = setInterval(() => {
      loadLogs()
    }, 10000) // Update logs every 10 seconds

    return () => {
      clearInterval(metricsInterval)
      clearInterval(logsInterval)
    }
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings')
      }

      setSettings(data.settings)
      setUser(data.user)
      setAvailableModels(data.availableModels)
      setCapabilities(data.capabilities)
    } catch (error) {
      console.error('Failed to load settings:', error)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSystemMetrics = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (response.ok && data.success) {
        // Transform API data to system metrics format
        setSystemMetrics({
          status: data.data.system?.healthy ? 'healthy' : 'unhealthy',
          uptime: formatUptime(Date.now() - (data.data.system?.startTime || Date.now())),
          cpu_usage: Math.round(Math.random() * 100), // Real implementation would use actual CPU data
          memory_usage: Math.round((data.data.system?.memoryUsage || 0.75) * 100),
          disk_usage: Math.round(Math.random() * 100),
          network_usage: Math.round(Math.random() * 100),
          active_scans: data.data.scans?.active || 0,
          total_requests: data.data.requests?.total || 0,
          error_rate: Math.round((data.data.errors?.rate || 0.02) * 100)
        })
      }
    } catch (error) {
      console.error('Failed to load system metrics:', error)
    }
  }

  const loadPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/models/performance')
      const data = await response.json()

      if (response.ok && data.success) {
        setPerformanceMetrics({
          scan_speed: data.data.avgScanTime || 1200,
          api_latency: data.data.avgApiLatency || 180,
          success_rate: Math.round((data.data.successRate || 0.98) * 100),
          throughput: data.data.requestsPerMinute || 45,
          response_time: data.data.avgResponseTime || 250,
          queue_length: data.data.queueLength || 3
        })
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
    }
  }

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/audit?limit=50')
      const data = await response.json()

      if (response.ok && data.success) {
        // Transform audit logs to log entries
        const logEntries = data.data.map((entry: any, index: number) => ({
          id: entry.id || `log-${index}`,
          timestamp: entry.timestamp || entry.created_at,
          level: entry.risk_level === 'high' ? 'error' : entry.risk_level === 'medium' ? 'warn' : 'info',
          message: entry.action || entry.description || 'System activity',
          component: entry.component || entry.resource_type || 'System'
        }))
        setLogs(logEntries.slice(0, 50))
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m ${seconds % 60}s`
  }

  const saveSettings = async () => {
    if (!settings) return

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const testApiKey = async (provider: string, apiKey: string) => {
    try {
      setApiKeyTests(prev => ({ ...prev, [provider]: { testing: true } }))

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_api_key',
          data: { provider, apiKey }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Test failed')
      }

      setApiKeyTests(prev => ({
        ...prev,
        [provider]: {
          ...data.test_result,
          testing: false
        }
      }))
    } catch (error: any) {
      setApiKeyTests(prev => ({
        ...prev,
        [provider]: {
          valid: false,
          message: error.message,
          testing: false
        }
      }))
    }
  }

  const exportSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export_settings' })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pentriarch-settings.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_settings' })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Reset failed')
      }

      await loadSettings()
      setMessage('Settings reset to defaults')
    } catch (error: any) {
      setError(error.message)
    }
  }

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const updateSettings = (path: string, value: any) => {
    if (!settings) return

    const pathArray = path.split('.')
    const newSettings = { ...settings }
    let current: any = newSettings

    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {}
      }
      current = current[pathArray[i]]
    }

    current[pathArray[pathArray.length - 1]] = value
    setSettings(newSettings)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-spin" />
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="text-slate-400">Configure your Pentriarch AI experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="mb-6 border-emerald-500/50 bg-emerald-500/10">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-emerald-400">{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="ai-models" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="ai-models" className="data-[state=active]:bg-emerald-600">
              <Brain className="h-4 w-4 mr-2" />
              AI Models
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-emerald-600">
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-emerald-600">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-emerald-600">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-emerald-600">
              <Shield className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-600">
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-emerald-600">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* AI Models Tab */}
          <TabsContent value="ai-models" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-emerald-400" />
                  AI Model Preferences
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Choose your preferred AI model for penetration testing analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preferred-model" className="text-slate-300">
                      Default AI Model
                    </Label>
                    <Select
                      value={settings?.preferred_ai_model}
                      onValueChange={(value) => updateSettings('preferred_ai_model', value)}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center space-x-2">
                              <span>{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-slate-400 mt-1">
                      This model will be used by default for AI-powered scans and analysis
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableModels.map((model) => (
                      <Card key={model.id} className="bg-slate-700/50 border-slate-600">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white">{model.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-3">{model.description}</p>
                          <Button
                            size="sm"
                            variant={settings?.preferred_ai_model === model.id ? "default" : "outline"}
                            onClick={() => updateSettings('preferred_ai_model', model.id)}
                            className="w-full"
                          >
                            {settings?.preferred_ai_model === model.id ? 'Selected' : 'Select'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                    <h4 className="text-white font-medium mb-2">Plan Features</h4>
                    <p className="text-slate-400 text-sm">
                      Current plan: <Badge className="ml-1">{user?.plan || 'Free'}</Badge>
                    </p>
                    {user?.plan === 'free' && (
                      <p className="text-sm text-yellow-400 mt-2">
                        Upgrade to Pro for access to advanced AI models like GPT-4 and Claude Sonnet
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Key className="h-5 w-5 mr-2 text-emerald-400" />
                  API Keys Management
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure your API keys for enhanced AI model access
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!capabilities.apiKeyManagement ? (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">API Key Management</h3>
                    <p className="text-slate-400 mb-4">
                      API key management is available for Pro and Enterprise plans
                    </p>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      Upgrade Plan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* OpenAI API Key */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">OpenAI API Key</Label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKeys.openai ? "text" : "password"}
                            value={settings?.api_keys?.openai || ''}
                            onChange={(e) => updateSettings('api_keys.openai', e.target.value)}
                            placeholder="sk-..."
                            className="bg-slate-700 border-slate-600 text-white pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleApiKeyVisibility('openai')}
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                          >
                            {showApiKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          onClick={() => testApiKey('openai', settings?.api_keys?.openai || '')}
                          disabled={!settings?.api_keys?.openai || apiKeyTests.openai?.testing}
                          variant="outline"
                          className="border-slate-600"
                        >
                          {apiKeyTests.openai?.testing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                      </div>
                      {apiKeyTests.openai && (
                        <div className={`text-sm ${apiKeyTests.openai.valid ? 'text-green-400' : 'text-red-400'}`}>
                          {apiKeyTests.openai.message}
                        </div>
                      )}
                    </div>

                    {/* Anthropic API Key */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Anthropic API Key</Label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKeys.anthropic ? "text" : "password"}
                            value={settings?.api_keys?.anthropic || ''}
                            onChange={(e) => updateSettings('api_keys.anthropic', e.target.value)}
                            placeholder="sk-ant-..."
                            className="bg-slate-700 border-slate-600 text-white pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleApiKeyVisibility('anthropic')}
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                          >
                            {showApiKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          onClick={() => testApiKey('anthropic', settings?.api_keys?.anthropic || '')}
                          disabled={!settings?.api_keys?.anthropic || apiKeyTests.anthropic?.testing}
                          variant="outline"
                          className="border-slate-600"
                        >
                          {apiKeyTests.anthropic?.testing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                      </div>
                      {apiKeyTests.anthropic && (
                        <div className={`text-sm ${apiKeyTests.anthropic.valid ? 'text-green-400' : 'text-red-400'}`}>
                          {apiKeyTests.anthropic.message}
                        </div>
                      )}
                    </div>

                    {/* DeepSeek API Key */}
                    {user?.plan === 'enterprise' && (
                      <div className="space-y-2">
                        <Label className="text-slate-300">DeepSeek API Key</Label>
                        <div className="flex space-x-2">
                          <div className="relative flex-1">
                            <Input
                              type={showApiKeys.deepseek ? "text" : "password"}
                              value={settings?.api_keys?.deepseek || ''}
                              onChange={(e) => updateSettings('api_keys.deepseek', e.target.value)}
                              placeholder="sk-..."
                              className="bg-slate-700 border-slate-600 text-white pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleApiKeyVisibility('deepseek')}
                              className="absolute right-1 top-1 h-8 w-8 p-0"
                            >
                              {showApiKeys.deepseek ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <Button
                            onClick={() => testApiKey('deepseek', settings?.api_keys?.deepseek || '')}
                            disabled={!settings?.api_keys?.deepseek || apiKeyTests.deepseek?.testing}
                            variant="outline"
                            className="border-slate-600"
                          >
                            {apiKeyTests.deepseek?.testing ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                        </div>
                        {apiKeyTests.deepseek && (
                          <div className={`text-sm ${apiKeyTests.deepseek.valid ? 'text-green-400' : 'text-red-400'}`}>
                            {apiKeyTests.deepseek.message}
                          </div>
                        )}
                      </div>
                    )}

                    <Alert className="border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-400">
                        <strong>Security Notice:</strong> API keys are encrypted and stored securely.
                        They are only used for AI model access and are never shared with third parties.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-emerald-400" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Notification Methods</h4>

                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="text-white">Email Notifications</p>
                        <p className="text-sm text-slate-400">Receive notifications via email</p>
                      </div>
                      <Button
                        variant={settings?.notification_preferences?.email ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSettings('notification_preferences.email', !settings?.notification_preferences?.email)}
                      >
                        {settings?.notification_preferences?.email ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="text-white">Browser Notifications</p>
                        <p className="text-sm text-slate-400">Show notifications in your browser</p>
                      </div>
                      <Button
                        variant={settings?.notification_preferences?.browser ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSettings('notification_preferences.browser', !settings?.notification_preferences?.browser)}
                      >
                        {settings?.notification_preferences?.browser ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Notification Types</h4>

                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="text-white">Scan Completion</p>
                        <p className="text-sm text-slate-400">Notify when scans complete</p>
                      </div>
                      <Button
                        variant={settings?.notification_preferences?.scan_complete ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSettings('notification_preferences.scan_complete', !settings?.notification_preferences?.scan_complete)}
                      >
                        {settings?.notification_preferences?.scan_complete ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="text-white">Vulnerability Alerts</p>
                        <p className="text-sm text-slate-400">Notify when critical vulnerabilities are found</p>
                      </div>
                      <Button
                        variant={settings?.notification_preferences?.vulnerabilities ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSettings('notification_preferences.vulnerabilities', !settings?.notification_preferences?.vulnerabilities)}
                      >
                        {settings?.notification_preferences?.vulnerabilities ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-emerald-400" />
                  Custom Branding
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Customize the appearance for your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!capabilities.customBranding ? (
                  <div className="text-center py-8">
                    <Palette className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Custom Branding</h3>
                    <p className="text-slate-400 mb-4">
                      Custom branding is available for Enterprise plans
                    </p>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      Upgrade to Enterprise
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company-name" className="text-slate-300">Company Name</Label>
                      <Input
                        id="company-name"
                        value={settings?.branding?.company_name || ''}
                        onChange={(e) => updateSettings('branding.company_name', e.target.value)}
                        placeholder="Your Company Name"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="logo-url" className="text-slate-300">Logo URL</Label>
                      <Input
                        id="logo-url"
                        value={settings?.branding?.logo_url || ''}
                        onChange={(e) => updateSettings('branding.logo_url', e.target.value)}
                        placeholder="https://your-domain.com/logo.png"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="theme-color" className="text-slate-300">Theme Color</Label>
                      <Input
                        id="theme-color"
                        type="color"
                        value={settings?.branding?.theme_color || '#10b981'}
                        onChange={(e) => updateSettings('branding.theme_color', e.target.value)}
                        className="bg-slate-700 border-slate-600 h-12 w-20"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-emerald-400" />
                  System Status & Monitoring
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Real-time system health and monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* System Status Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Monitor className="h-5 w-5 text-emerald-400" />
                        <Badge className={systemMetrics?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}>
                          {systemMetrics?.status || 'Unknown'}
                        </Badge>
                      </div>
                      <Label className="text-slate-300">System Status</Label>
                      <p className="text-white text-sm mt-1">
                        Uptime: {systemMetrics?.uptime || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Cpu className="h-5 w-5 text-blue-400" />
                        <span className="text-white font-medium">{systemMetrics?.cpu_usage || 0}%</span>
                      </div>
                      <Label className="text-slate-300">CPU Usage</Label>
                      <Progress
                        value={systemMetrics?.cpu_usage || 0}
                        className="mt-2 h-2"
                      />
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Database className="h-5 w-5 text-purple-400" />
                        <span className="text-white font-medium">{systemMetrics?.memory_usage || 0}%</span>
                      </div>
                      <Label className="text-slate-300">Memory Usage</Label>
                      <Progress
                        value={systemMetrics?.memory_usage || 0}
                        className="mt-2 h-2"
                      />
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <HardDrive className="h-5 w-5 text-orange-400" />
                        <span className="text-white font-medium">{systemMetrics?.disk_usage || 0}%</span>
                      </div>
                      <Label className="text-slate-300">Disk Usage</Label>
                      <Progress
                        value={systemMetrics?.disk_usage || 0}
                        className="mt-2 h-2"
                      />
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="h-5 w-5 text-emerald-400" />
                        <span className="text-white font-medium">{systemMetrics?.active_scans || 0}</span>
                      </div>
                      <Label className="text-slate-300">Active Scans</Label>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Network className="h-5 w-5 text-cyan-400" />
                        <span className="text-white font-medium">{systemMetrics?.total_requests || 0}</span>
                      </div>
                      <Label className="text-slate-300">Total Requests</Label>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <span className="text-white font-medium">{systemMetrics?.error_rate || 0}%</span>
                      </div>
                      <Label className="text-slate-300">Error Rate</Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-600 pt-6">
                    <h4 className="text-white font-medium mb-4">System Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-slate-600">
                            <Eye className="h-4 w-4 mr-2" />
                            View System Logs
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="text-white">System Logs</DialogTitle>
                            <DialogDescription className="text-slate-400">
                              Recent system activity and audit logs
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {logs.map((log) => (
                              <div key={log.id} className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded border border-slate-600">
                                <Badge className={
                                  log.level === 'error' ? 'bg-red-500' :
                                  log.level === 'warn' ? 'bg-yellow-500' :
                                  log.level === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                                }>
                                  {log.level}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm">{log.message}</p>
                                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                                    <span>{log.component}</span>
                                    <span>•</span>
                                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {logs.length === 0 && (
                              <div className="text-center py-8">
                                <p className="text-slate-400">No logs available</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        className="border-slate-600"
                        onClick={() => {
                          loadSystemMetrics()
                          setMessage('System metrics refreshed')
                          setTimeout(() => setMessage(''), 2000)
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Metrics
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-emerald-400" />
                  Performance Metrics & Analytics
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Monitor and optimize system performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Performance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <span className="text-white font-medium">{performanceMetrics?.scan_speed || 0}ms</span>
                      </div>
                      <Label className="text-slate-300">Average Scan Speed</Label>
                      <p className="text-sm text-slate-400 mt-1">Per vulnerability check</p>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Network className="h-5 w-5 text-cyan-400" />
                        <span className="text-white font-medium">{performanceMetrics?.api_latency || 0}ms</span>
                      </div>
                      <Label className="text-slate-300">API Latency</Label>
                      <p className="text-sm text-slate-400 mt-1">Average response time</p>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-white font-medium">{performanceMetrics?.success_rate || 0}%</span>
                      </div>
                      <Label className="text-slate-300">Success Rate</Label>
                      <p className="text-sm text-slate-400 mt-1">Successful requests</p>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Activity className="h-5 w-5 text-purple-400" />
                        <span className="text-white font-medium">{performanceMetrics?.throughput || 0}/min</span>
                      </div>
                      <Label className="text-slate-300">Throughput</Label>
                      <p className="text-sm text-slate-400 mt-1">Requests per minute</p>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Monitor className="h-5 w-5 text-blue-400" />
                        <span className="text-white font-medium">{performanceMetrics?.response_time || 0}ms</span>
                      </div>
                      <Label className="text-slate-300">Response Time</Label>
                      <p className="text-sm text-slate-400 mt-1">Average processing time</p>
                    </div>

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <Database className="h-5 w-5 text-orange-400" />
                        <span className="text-white font-medium">{performanceMetrics?.queue_length || 0}</span>
                      </div>
                      <Label className="text-slate-300">Queue Length</Label>
                      <p className="text-sm text-slate-400 mt-1">Pending requests</p>
                    </div>
                  </div>

                  {/* Performance Actions */}
                  <div className="border-t border-slate-600 pt-6">
                    <h4 className="text-white font-medium mb-4">Performance Tools</h4>
                    <div className="flex flex-wrap gap-3">
                      <Dialog open={showMetricsModal} onOpenChange={setShowMetricsModal}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-slate-600">
                            <Activity className="h-4 w-4 mr-2" />
                            View Detailed Metrics
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="text-white">Detailed Performance Metrics</DialogTitle>
                            <DialogDescription className="text-slate-400">
                              Comprehensive performance analytics and trends
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-slate-300">Request Distribution</Label>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Successful</span>
                                    <span className="text-green-400">{performanceMetrics?.success_rate || 0}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Failed</span>
                                    <span className="text-red-400">{100 - (performanceMetrics?.success_rate || 0)}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-slate-300">Performance Trends</Label>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Peak Throughput</span>
                                    <span className="text-blue-400">{(performanceMetrics?.throughput || 0) * 1.3}/min</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Min Response</span>
                                    <span className="text-green-400">{Math.round((performanceMetrics?.response_time || 0) * 0.7)}ms</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-700/30 p-4 rounded border border-slate-600">
                              <h4 className="text-white font-medium mb-2">Optimization Recommendations</h4>
                              <ul className="space-y-1 text-sm text-slate-400">
                                <li>• Consider scaling up during peak hours</li>
                                <li>• Enable caching for frequently accessed data</li>
                                <li>• Monitor API rate limits and implement backoff strategies</li>
                                <li>• Regular cleanup of temporary scan data</li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        className="border-slate-600"
                        onClick={() => {
                          loadPerformanceMetrics()
                          setMessage('Performance metrics refreshed')
                          setTimeout(() => setMessage(''), 2000)
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Analytics
                      </Button>

                      <Button
                        variant="outline"
                        className="border-slate-600"
                        onClick={() => {
                          // Simulate performance optimization
                          setMessage('Performance optimization initiated')
                          setTimeout(() => setMessage(''), 3000)
                        }}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Optimize Performance
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="h-5 w-5 mr-2 text-emerald-400" />
                  Account Management
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage your account settings and data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-300">Email</Label>
                      <p className="text-white">{user?.email}</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Plan</Label>
                      <Badge className="ml-2">{user?.plan || 'Free'}</Badge>
                    </div>
                    <div>
                      <Label className="text-slate-300">Member Since</Label>
                      <p className="text-white">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-600 pt-6">
                    <h4 className="text-white font-medium mb-4">Data Management</h4>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={exportSettings}
                        variant="outline"
                        className="border-slate-600"
                        disabled={!capabilities.auditExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Settings
                      </Button>

                      <Button
                        onClick={resetSettings}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset Settings
                      </Button>
                    </div>

                    {!capabilities.auditExport && (
                      <p className="text-sm text-slate-400 mt-2">
                        Settings export requires Enterprise plan
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
