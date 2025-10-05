'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Shield,
  Play,
  Square,
  Brain,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Server,
  Eye,
  Download,
  Settings,
  RefreshCw,
  Terminal,
  Container,
  Cpu,
  MemoryStick,
  Network,
  FileText,
  BarChart3
} from 'lucide-react'
import { getCurrentUserClient, createScan } from '@/lib/supabase'
import { useWebSocket } from '@/hooks/useWebSocket'
import { SECURITY_TOOLS } from '@/lib/toolsRouter'
import ContainerManager from './ContainerManager'
import ModelSelector from './ModelSelector'
import WebSocketStatus from './WebSocketStatus'
import type { ScanProgress, ContainerStatus, NotificationData } from '@/lib/websocket'

interface ScanState {
  id?: string
  status: 'idle' | 'configuring' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep: string
  output: string[]
  startTime?: Date
  endTime?: Date
  containerId?: string
  estimatedTimeRemaining?: number
}

interface ScanConfig {
  target: string
  tool: string
  prompt: string
  aiModel: string
  priority: 'low' | 'medium' | 'high'
  timeout: number
}

export default function ScanningFlow() {
  const [user, setUser] = useState<any>(null)
  const [scanState, setScanState] = useState<ScanState>({
    status: 'idle',
    progress: 0,
    currentStep: '',
    output: []
  })

  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    target: '',
    tool: '',
    prompt: '',
    aiModel: 'claude-3.5-sonnet',
    priority: 'medium',
    timeout: 1800 // 30 minutes
  })

  const [containerStats, setContainerStats] = useState<ContainerStatus | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [selectedTab, setSelectedTab] = useState('configure')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // WebSocket integration
  const {
    isConnected,
    isConnecting,
    error: wsError,
    connectionAttempts,
    lastConnected,
    connect: reconnectWS,
    subscribeScan,
    subscribeContainer,
    subscribeNotifications
  } = useWebSocket({
    userId: user?.id || '',
    onScanProgress: handleScanProgress,
    onContainerStatus: handleContainerStatus,
    onNotification: handleNotification,
    onScanComplete: handleScanComplete,
    onScanError: handleScanError
  })

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user?.id) {
      subscribeNotifications()
    }
  }, [user?.id, subscribeNotifications])

  useEffect(() => {
    if (scanState.id && scanState.status === 'running') {
      subscribeScan(scanState.id)
      subscribeContainer(scanState.id)
    }
  }, [scanState.id, scanState.status, subscribeScan, subscribeContainer])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  function handleScanProgress(progress: ScanProgress) {
    setScanState(prev => ({
      ...prev,
      progress: progress.progress,
      currentStep: progress.currentStep,
      output: progress.output ? [...prev.output, progress.output] : prev.output,
      estimatedTimeRemaining: progress.estimatedTimeRemaining
    }))
  }

  function handleContainerStatus(status: ContainerStatus) {
    setContainerStats(status)

    if (status.status === 'running' && scanState.status !== 'running') {
      setScanState(prev => ({ ...prev, status: 'running' }))
    }
  }

  function handleNotification(notification: NotificationData) {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10
  }

  function handleScanComplete(result: any) {
    setScanState(prev => ({
      ...prev,
      status: 'completed',
      progress: 100,
      currentStep: 'Scan completed successfully',
      endTime: new Date()
    }))
  }

  function handleScanError(error: any) {
    setScanState(prev => ({
      ...prev,
      status: 'failed',
      currentStep: `Error: ${error.message || 'Scan failed'}`,
      endTime: new Date()
    }))
  }

  const startScan = async () => {
    if (!user || !scanConfig.target || !scanConfig.tool) {
      return
    }

    try {
      setScanState(prev => ({ ...prev, status: 'starting', progress: 0, output: [] }))

      // Create scan record
      const scanData = {
        user_id: user.id,
        target: scanConfig.target,
        tool_used: scanConfig.tool,
        prompt: scanConfig.prompt,
        ai_model: scanConfig.aiModel,
        status: 'queued' as 'queued',
        start_time: new Date().toISOString(),
        metadata: {
          priority: scanConfig.priority,
          timeout: scanConfig.timeout
        }
      }

      const scan = await createScan(scanData)

      setScanState(prev => ({
        ...prev,
        id: scan.id,
        status: 'running',
        startTime: new Date(),
        currentStep: 'Initializing scan...'
      }))

      // Get JWT from Supabase client (browser)
      let accessToken = null
      if (window && window.localStorage) {
        // Supabase stores session in localStorage under 'supabase.auth.token'
        const raw = window.localStorage.getItem('supabase.auth.token')
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            accessToken = parsed?.currentSession?.access_token || null
          } catch {}
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      // Start the scan execution
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scanId: scan.id,
          command: {
            tool: scanConfig.tool,
            target: scanConfig.target,
            prompt: scanConfig.prompt,
            priority: scanConfig.priority
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start scan')
      }

      const result = await response.json()

      if (result.containerId) {
        setScanState(prev => ({ ...prev, containerId: result.containerId }))
      }

      setSelectedTab('monitor')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to start scan:', errorMsg);
      setScanState(prev => ({
        ...prev,
        status: 'failed',
        currentStep: `Failed to start: ${errorMsg}`,
        endTime: new Date()
      }));
    }
  }

  const stopScan = async () => {
    if (!scanState.id) return

    try {
      const response = await fetch('/api/containers/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: scanState.id })
      })

      if (response.ok) {
        setScanState(prev => ({
          ...prev,
          status: 'cancelled',
          currentStep: 'Scan cancelled by user',
          endTime: new Date()
        }))
      }
    } catch (error) {
      console.error('Failed to stop scan:', error)
    }
  }

  const resetScan = () => {
    setScanState({
      status: 'idle',
      progress: 0,
      currentStep: '',
      output: []
    })
    setContainerStats(null)
    setSelectedTab('configure')
  }

  const getStatusIcon = () => {
    switch (scanState.status) {
      case 'running':
        return <Activity className="h-5 w-5 text-blue-400 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'cancelled':
        return <Square className="h-5 w-5 text-yellow-400" />
      default:
        return <Shield className="h-5 w-5 text-slate-400" />
    }
  }

  const getDuration = () => {
    if (!scanState.startTime) return ''
    const endTime = scanState.endTime || new Date()
    const duration = Math.floor((endTime.getTime() - scanState.startTime.getTime()) / 1000)

    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Security Scanning</h1>
              <p className="text-slate-400">AI-powered penetration testing workflow</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <WebSocketStatus
              isConnected={isConnected}
              isConnecting={isConnecting}
              error={wsError}
              connectionAttempts={connectionAttempts}
              lastConnected={lastConnected}
              onReconnect={reconnectWS}
            />

            {notifications.length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {notifications.length} notifications
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="configure" className="data-[state=active]:bg-emerald-600">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-emerald-600">
              <Activity className="h-4 w-4 mr-2" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="containers" className="data-[state=active]:bg-emerald-600">
              <Container className="h-4 w-4 mr-2" />
              Containers
            </TabsTrigger>
            <TabsTrigger value="models" className="data-[state=active]:bg-emerald-600">
              <Brain className="h-4 w-4 mr-2" />
              AI Models
            </TabsTrigger>
          </TabsList>

          {/* Configure Tab */}
          <TabsContent value="configure" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scan Configuration */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-emerald-400" />
                    Scan Configuration
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure your security scanning parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="target" className="text-slate-300">Target</Label>
                    <Input
                      id="target"
                      placeholder="Enter target (IP, domain, or URL)"
                      value={scanConfig.target}
                      onChange={(e) => setScanConfig(prev => ({ ...prev, target: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tool" className="text-slate-300">Security Tool</Label>
                    <Select value={scanConfig.tool} onValueChange={(value) => setScanConfig(prev => ({ ...prev, tool: value }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select a security tool" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {SECURITY_TOOLS.map(tool => (
                          <SelectItem key={tool.id} value={tool.id}>
                            <div className="flex items-center space-x-2">
                              <span>{tool.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {tool.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="prompt" className="text-slate-300">AI Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Describe what you want to scan for..."
                      value={scanConfig.prompt}
                      onChange={(e) => setScanConfig(prev => ({ ...prev, prompt: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </Button>

                  {showAdvanced && (
                    <div className="space-y-4 pt-4 border-t border-slate-700">
                      <div>
                        <Label htmlFor="priority" className="text-slate-300">Priority</Label>
                        <Select value={scanConfig.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setScanConfig(prev => ({ ...prev, priority: value }))}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timeout" className="text-slate-300">Timeout (seconds)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          value={scanConfig.timeout}
                          onChange={(e) => setScanConfig(prev => ({ ...prev, timeout: Number.parseInt(e.target.value) || 1800 }))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scan Status */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon()}
                      <span className="ml-2">Scan Status</span>
                    </div>
                    <Badge className={`${
                      scanState.status === 'running' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      scanState.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      scanState.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {scanState.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scanState.status === 'running' && (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300">Progress</span>
                          <span className="text-white">{Math.round(scanState.progress)}%</span>
                        </div>
                        <Progress value={scanState.progress} className="w-full" />
                      </div>

                      <div className="text-sm">
                        <p className="text-slate-300 mb-1">Current Step:</p>
                        <p className="text-white">{scanState.currentStep}</p>
                      </div>

                      {scanState.estimatedTimeRemaining && (
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <Clock className="h-4 w-4" />
                          <span>~{Math.round(scanState.estimatedTimeRemaining / 60)} minutes remaining</span>
                        </div>
                      )}
                    </>
                  )}

                  {scanState.startTime && (
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span>Duration: {getDuration()}</span>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {scanState.status === 'idle' && (
                      <Button
                        onClick={startScan}
                        disabled={!scanConfig.target || !scanConfig.tool || !isConnected}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Scan
                      </Button>
                    )}

                    {scanState.status === 'running' && (
                      <Button
                        onClick={stopScan}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Stop Scan
                      </Button>
                    )}

                    {(scanState.status === 'completed' || scanState.status === 'failed' || scanState.status === 'cancelled') && (
                      <Button
                        onClick={resetScan}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        New Scan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {!isConnected && (
              <Alert className="bg-yellow-900/20 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  Real-time updates are not available. Some features may be limited.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Real-time Output */}
              <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Terminal className="h-5 w-5 mr-2 text-emerald-400" />
                    Live Output
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                    {scanState.output.length > 0 ? (
                      scanState.output.map((line, index) => (
                        <div key={index} className="text-green-400 mb-1">
                          {line}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-center pt-8">
                        No output yet. Start a scan to see live results.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Container Stats */}
              {containerStats && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Server className="h-5 w-5 mr-2 text-emerald-400" />
                      Container Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Cpu className="h-4 w-4 text-blue-400" />
                          <span className="text-slate-300">CPU</span>
                        </div>
                        <span className="text-white">{containerStats.cpuUsage || '0%'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MemoryStick className="h-4 w-4 text-green-400" />
                          <span className="text-slate-300">Memory</span>
                        </div>
                        <span className="text-white">{containerStats.memoryUsage || '0MB'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-400" />
                          <span className="text-slate-300">Uptime</span>
                        </div>
                        <span className="text-white">{containerStats.uptime || '0s'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-purple-400" />
                          <span className="text-slate-300">Status</span>
                        </div>
                        <Badge className={
                          containerStats.status === 'running' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }>
                          {containerStats.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Containers Tab */}
          <TabsContent value="containers" className="space-y-6">
            <ContainerManager />
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <ModelSelector />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
