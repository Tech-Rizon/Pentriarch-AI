'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  Square,
  RefreshCw,
  Activity,
  Monitor,
  HardDrive,
  Cpu,
  Clock,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  Download,
  Settings,
  Container
} from 'lucide-react'
import { getAccessTokenClient } from '@/lib/supabase'

interface ContainerStats {
  memory_usage: string
  cpu_usage: string
  uptime: string
  container_id: string
  image: string
  created: string
}

interface ContainerStatus {
  exists: boolean
  running: boolean
  stats?: ContainerStats
}

interface ContainerLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  raw_output?: string
}

interface ContainerManagerProps {
  scanId?: string
  onStatusChange?: (status: ContainerStatus) => void
}

export default function ContainerManager({ scanId, onStatusChange }: ContainerManagerProps) {
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>({
    exists: false,
    running: false
  })
  const [logs, setLogs] = useState<ContainerLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showRawLogs, setShowRawLogs] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadContainerStatus()

    if (autoRefresh) {
      intervalRef.current = setInterval(loadContainerStatus, 5000) // Refresh every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [scanId, autoRefresh])

  useEffect(() => {
    // Auto-scroll logs to bottom
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const loadContainerStatus = async () => {
    try {
      setIsRefreshing(true)
      const accessToken = await getAccessTokenClient()
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      // Get container status
      const statusResponse = await fetch(
        `/api/containers/status${scanId ? `?scanId=${scanId}` : ''}`,
        { headers }
      )
      const statusData = await statusResponse.json()

      if (statusResponse.ok) {
        setContainerStatus(statusData)
        onStatusChange?.(statusData)
      }

      // Get logs if we have a scan ID
      if (scanId) {
        const logsResponse = await fetch(`/api/scans/${scanId}/logs`, { headers })
        const logsData = await logsResponse.json()

        if (logsResponse.ok && logsData.logs) {
          setLogs(logsData.logs.map((log: any) => ({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            raw_output: log.raw_output
          })))
        }
      }

    } catch (error) {
      console.error('Failed to load container status:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const killContainer = async () => {
    if (!scanId || !containerStatus.running) return

    try {
      const accessToken = await getAccessTokenClient()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      const response = await fetch(`/api/containers/kill`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scanId })
      })

      if (response.ok) {
        await loadContainerStatus()
      }
    } catch (error) {
      console.error('Failed to kill container:', error)
    }
  }

  const downloadLogs = () => {
    const logData = logs.map(log =>
      `${log.timestamp} [${log.level.toUpperCase()}] ${log.message}${log.raw_output ? '\n' + log.raw_output : ''}`
    ).join('\n')

    const blob = new Blob([logData], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `container-logs-${scanId || 'all'}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getStatusIcon = () => {
    if (isLoading || isRefreshing) {
      return <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
    }
    if (containerStatus.running) {
      return <CheckCircle className="h-5 w-5 text-green-400" />
    }
    if (containerStatus.exists) {
      return <Square className="h-5 w-5 text-yellow-400" />
    }
    return <AlertTriangle className="h-5 w-5 text-red-400" />
  }

  const getStatusText = () => {
    if (isLoading) return 'Loading...'
    if (containerStatus.running) return 'Running'
    if (containerStatus.exists) return 'Stopped'
    return 'Not Found'
  }

  const getStatusColor = () => {
    if (containerStatus.running) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (containerStatus.exists) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      default:
        return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  const parseMemoryUsage = (usage: string): number => {
    const match = usage.match(/(\d+(?:\.\d+)?)(MB|GB)/)
    if (!match) return 0
    const value = Number.parseFloat(match[1])
    const unit = match[2]
    return unit === 'GB' ? value * 1024 : value
  }

  const parseCpuUsage = (usage: string): number => {
    const match = usage.match(/(\d+(?:\.\d+)?)%/)
    return match ? Number.parseFloat(match[1]) : 0
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Container className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading container status...</p>
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
            <Container className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Container Manager</h1>
              <p className="text-slate-400">
                Monitor and manage security scanning containers
                {scanId && ` for scan ${scanId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`border-slate-600 ${autoRefresh ? 'text-emerald-400' : 'text-slate-300'}`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button
              variant="outline"
              onClick={loadContainerStatus}
              disabled={isRefreshing}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon()}
                <span className="ml-2">Container Status</span>
              </div>
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {containerStatus.stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <HardDrive className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {containerStatus.stats.memory_usage}
                  </div>
                  <p className="text-slate-400">Memory Usage</p>
                  <Progress
                    value={parseMemoryUsage(containerStatus.stats.memory_usage)}
                    max={512}
                    className="mt-2"
                  />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Cpu className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {containerStatus.stats.cpu_usage}
                  </div>
                  <p className="text-slate-400">CPU Usage</p>
                  <Progress
                    value={parseCpuUsage(containerStatus.stats.cpu_usage)}
                    max={100}
                    className="mt-2"
                  />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {containerStatus.stats.uptime}
                  </div>
                  <p className="text-slate-400">Uptime</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Container className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-sm font-mono text-white">
                    {containerStatus.stats.container_id.substring(0, 12)}
                  </div>
                  <p className="text-slate-400">Container ID</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Container className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">No container statistics available</p>
                {!containerStatus.exists && (
                  <p className="text-sm text-slate-500 mt-2">
                    Container may not be running or doesn't exist
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Container Management */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">
              <Monitor className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-emerald-600">
              <Terminal className="h-4 w-4 mr-2" />
              Logs ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-emerald-600">
              <Settings className="h-4 w-4 mr-2" />
              Actions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-emerald-400" />
                  Container Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {containerStatus.stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-400">Container ID</label>
                        <p className="text-white font-mono text-sm">{containerStatus.stats.container_id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Image</label>
                        <p className="text-white">{containerStatus.stats.image}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Created</label>
                        <p className="text-white">{new Date(containerStatus.stats.created).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-400">Status</label>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon()}
                          <span className="text-white">{getStatusText()}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Resource Usage</label>
                        <div className="space-y-2 mt-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Memory:</span>
                            <span className="text-white">{containerStatus.stats.memory_usage}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">CPU:</span>
                            <span className="text-white">{containerStatus.stats.cpu_usage}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Uptime</label>
                        <p className="text-white">{containerStatus.stats.uptime}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Info className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">Container information not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <Terminal className="h-5 w-5 mr-2 text-emerald-400" />
                    Container Logs
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRawLogs(!showRawLogs)}
                      className="border-slate-600 text-slate-300"
                    >
                      {showRawLogs ? 'Hide Raw' : 'Show Raw'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadLogs}
                      className="border-slate-600 text-slate-300"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearLogs}
                      className="border-slate-600 text-slate-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-h-96 overflow-y-auto">
                  {logs.length > 0 ? (
                    <div className="space-y-2">
                      {logs.map((log, index) => (
                        <div key={index} className="flex items-start space-x-2 text-sm">
                          <div className="flex-shrink-0 mt-0.5">
                            {getLevelIcon(log.level)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                              <Badge variant="outline" className="text-xs">
                                {log.level}
                              </Badge>
                            </div>
                            <p className="text-slate-200 break-words">{log.message}</p>
                            {showRawLogs && log.raw_output && (
                              <pre className="mt-2 p-2 bg-slate-800 rounded text-xs text-green-400 overflow-x-auto">
                                {log.raw_output}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Terminal className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No logs available</p>
                      <p className="text-sm text-slate-500 mt-2">
                        Logs will appear here when the container generates output
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-emerald-400" />
                  Container Actions
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage container lifecycle and operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={killContainer}
                    disabled={!containerStatus.running || !scanId}
                    variant="destructive"
                    className="h-16 flex-col"
                  >
                    <Square className="h-6 w-6 mb-1" />
                    Stop Container
                  </Button>

                  <Button
                    onClick={loadContainerStatus}
                    disabled={isRefreshing}
                    variant="outline"
                    className="h-16 flex-col border-slate-600"
                  >
                    <RefreshCw className={`h-6 w-6 mb-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </Button>

                  <Button
                    onClick={downloadLogs}
                    disabled={logs.length === 0}
                    variant="outline"
                    className="h-16 flex-col border-slate-600"
                  >
                    <Download className="h-6 w-6 mb-1" />
                    Export Logs
                  </Button>
                </div>

                {containerStatus.running && (
                  <Alert className="mt-6 border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-400">
                      <strong>Warning:</strong> Stopping the container will terminate the current scan operation.
                      Make sure to save any important results before proceeding.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
