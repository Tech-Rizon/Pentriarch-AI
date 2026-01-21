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
import { AIAnalysisPanel } from './AIAnalysisPanel'
import { ScanConfigurationModal } from './ScanConfigurationModal'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
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
  BarChart3,
  PanelLeftClose,
  PanelRightClose,
  Maximize2,
  Minimize2,
  Users,
  Database,
  Search,
  Filter,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react'
import { getCurrentUserClient, createScan } from '@/lib/supabase'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePanelLayout } from '@/hooks/usePanelLayout'
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
  results?: any
}

interface ScanConfig {
  target: string
  tool: string
  prompt: string
  aiModel: string
  priority: 'low' | 'medium' | 'high'
  timeout: number
}



export default function SecurityWorkspace() {
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
    timeout: 1800
  })

  const [containerStats, setContainerStats] = useState<ContainerStatus | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  // Panel layout persistence
  const { layout, togglePanel, updatePanelSizes, getPanelSizes } = usePanelLayout({
    storageKey: 'pentriarch-security-workspace-layout'
  })

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
  }, [user?.id])

  useEffect(() => {
    if (scanState.id && scanState.status === 'running') {
      subscribeScan(scanState.id)
      subscribeContainer(scanState.id)
    }
  }, [scanState.id, scanState.status])

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
    setNotifications(prev => [notification, ...prev.slice(0, 9)])
  }

  function handleScanComplete(result: any) {
    setScanState(prev => ({
      ...prev,
      status: 'completed',
      progress: 100,
      currentStep: 'Scan completed successfully',
      endTime: new Date(),
      results: result
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

      const scanData = {
        user_id: user.id,
        target: scanConfig.target,
        tool_used: scanConfig.tool,
        prompt: scanConfig.prompt,
        ai_model: scanConfig.aiModel,
        status: 'queued',
        metadata: {
          priority: scanConfig.priority,
          timeout: scanConfig.timeout
        }
      }

  const scan = await createScan({ ...scanData, start_time: new Date().toISOString(), status: 'queued' })

      setScanState(prev => ({
        ...prev,
        id: scan.id,
        status: 'running',
        startTime: new Date(),
        currentStep: 'Initializing scan...'
      }))

      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: scanConfig.tool,
          target: scanConfig.target,
          flags: [],
          timeout: scanConfig.timeout,
          description: scanConfig.prompt
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start scan')
      }

      const result = await response.json()

      if (result.containerId) {
        setScanState(prev => ({ ...prev, containerId: result.containerId }))
      }

    } catch (error) {
      console.error('Failed to start scan:', error)
      setScanState(prev => ({
        ...prev,
        status: 'failed',
  currentStep: `Failed to start: ${error instanceof Error ? error.message : String(error)}`,
        endTime: new Date()
      }))
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-emerald-400" />
            <h1 className="text-lg font-semibold text-white">Security Workspace</h1>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge className={`${
              scanState.status === 'running' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              scanState.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
              scanState.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}>
              {scanState.status}
            </Badge>

            {scanState.progress > 0 && scanState.status === 'running' && (
              <span className="text-sm text-slate-300">{Math.round(scanState.progress)}%</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <ScanConfigurationModal
            scanConfig={scanConfig}
            setScanConfig={setScanConfig}
            onStartScan={startScan}
            isConnected={isConnected}
            disabled={scanState.status === 'running'}
          />

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
              {notifications.length}
            </Badge>
          )}

          {scanState.status === 'running' && (
            <Button
              onClick={stopScan}
              variant="destructive"
              size="sm"
              className="h-8"
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}

          {(scanState.status === 'completed' || scanState.status === 'failed' || scanState.status === 'cancelled') && (
            <Button
              onClick={resetScan}
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              New Scan
            </Button>
          )}

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePanel('right')}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Center Panel - Results/Sandbox */}
          <ResizablePanel defaultSize={75} minSize={50}>
            <div className="h-full flex flex-col bg-slate-900/50">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-emerald-400" />
                  Scan Results
                </h2>
                <p className="text-sm text-slate-400 mt-1">Live security scan results and analysis</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {scanState.status === 'idle' && (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Shield className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-white mb-2">Ready to Scan</h3>
                      <p className="text-slate-400 mb-4">Configure your target and start a security scan</p>
                      <div className="text-sm text-slate-500">
                        Results will appear here in real-time
                      </div>
                    </div>
                  </div>
                )}

                {scanState.status === 'running' && (
                  <div className="space-y-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-400 animate-pulse" />
                          Scan in Progress
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Target: {scanConfig.target} | Tool: {scanConfig.tool}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-300">Overall Progress</span>
                              <span className="text-white">{Math.round(scanState.progress)}%</span>
                            </div>
                            <Progress value={scanState.progress} className="w-full" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-300 mb-1">Current Step:</p>
                            <p className="text-white text-sm">{scanState.currentStep}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Live Results Placeholder */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white">Live Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {scanState.output.slice(-5).map((line, index) => (
                            <div key={index} className="text-sm font-mono text-green-400 bg-black/50 p-2 rounded">
                              {line}
                            </div>
                          ))}
                          {scanState.output.length === 0 && (
                            <p className="text-slate-500 text-sm">Waiting for scan output...</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {scanState.status === 'completed' && (
                  <div className="space-y-4">
                    <Card className="bg-green-900/20 border-green-500/30">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                          Scan Completed Successfully
                        </CardTitle>
                        <CardDescription className="text-green-300">
                          Duration: {getDuration()} | Target: {scanConfig.target}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex space-x-2">
                          <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                          <Button variant="outline" className="border-slate-600 text-slate-300">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Results Summary */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white">Results Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-red-400">3</div>
                            <div className="text-sm text-slate-400">High Risk</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-400">7</div>
                            <div className="text-sm text-slate-400">Medium Risk</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-400">12</div>
                            <div className="text-sm text-slate-400">Low Risk</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {(scanState.status === 'failed' || scanState.status === 'cancelled') && (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-white mb-2">
                        Scan {scanState.status === 'failed' ? 'Failed' : 'Cancelled'}
                      </h3>
                      <p className="text-slate-400 mb-4">{scanState.currentStep}</p>
                      <Button onClick={resetScan} className="bg-emerald-600 hover:bg-emerald-700">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          {/* Right Panel - Output/Terminal */}
          {!layout.rightPanelCollapsed && (
            <>
              <ResizableHandle className="bg-slate-700 hover:bg-slate-600 w-1" />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="h-full flex flex-col bg-slate-800/30 border-l border-slate-700">
                  <Tabs defaultValue="output" className="h-full flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                      <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                        <TabsTrigger value="output" className="data-[state=active]:bg-emerald-600">
                          <Terminal className="h-4 w-4 mr-1" />
                          Output
                        </TabsTrigger>
                        <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-purple-600">
                          <Brain className="h-4 w-4 mr-1" />
                          AI Analysis
                        </TabsTrigger>
                        <TabsTrigger value="containers" className="data-[state=active]:bg-emerald-600">
                          <Container className="h-4 w-4 mr-1" />
                          Containers
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="data-[state=active]:bg-emerald-600">
                          <Activity className="h-4 w-4 mr-1" />
                          Logs
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="output" className="flex-1 overflow-hidden">
                      <div className="h-full p-4">
                        <div className="bg-black rounded-lg p-4 h-full overflow-y-auto font-mono text-sm">
                          {scanState.output.length > 0 ? (
                            scanState.output.map((line, index) => (
                              <div key={index} className="text-green-400 mb-1">
                                <span className="text-slate-500 mr-2">
                                  {new Date().toLocaleTimeString()}
                                </span>
                                {line}
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 text-center pt-8">
                              No output yet. Start a scan to see live results.
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="containers" className="flex-1 overflow-hidden">
                      <div className="h-full p-4 overflow-y-auto">
                        {containerStats ? (
                          <Card className="bg-slate-700/50 border-slate-600">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-white text-sm flex items-center">
                                <Server className="h-4 w-4 mr-2 text-emerald-400" />
                                Container Stats
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <Cpu className="h-4 w-4 text-blue-400" />
                                  <span className="text-slate-300">CPU</span>
                                </div>
                                <span className="text-white">{containerStats.cpuUsage || '0%'}</span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <MemoryStick className="h-4 w-4 text-green-400" />
                                  <span className="text-slate-300">Memory</span>
                                </div>
                                <span className="text-white">{containerStats.memoryUsage || '0MB'}</span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-yellow-400" />
                                  <span className="text-slate-300">Uptime</span>
                                </div>
                                <span className="text-white">{containerStats.uptime || '0s'}</span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
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
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="text-center py-8">
                            <Container className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 text-sm">No active containers</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="notifications" className="flex-1 overflow-hidden">
                      <div className="h-full p-4 overflow-y-auto space-y-2">
                        {notifications.length > 0 ? (
                          notifications.map((notification, index) => (
                            <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                              <div className="flex items-center space-x-2 mb-1">
                                <Activity className="h-3 w-3 text-blue-400" />
                                <span className="text-white font-medium">{notification.title}</span>
                              </div>
                              <p className="text-slate-300 text-xs">{notification.message}</p>
                              <p className="text-slate-500 text-xs mt-1">
                                {new Date(String(notification.timestamp)).toLocaleTimeString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 text-sm">No notifications</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
