'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import {
  Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Server,
  Database,
  Cpu,
  MemoryStick,
  Download,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { performanceMonitor, usePerformanceMonitor } from '@/lib/performanceMonitor'

interface PerformanceMetrics {
  apiResponseTimes: { avg: number; p95: number; p99: number }
  errorRate: number
  userSessions: number
  activeUsers: number
  topErrors: Array<{ message: string; count: number; severity: string }>
  slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>
}

interface ChartData {
  responseTimeChart: Array<{ time: number; value: number }>
  errorRateChart: Array<{ time: number; value: number }>
  userActivityChart: Array<{ time: number; value: number }>
  memoryUsageChart: Array<{ time: number; value: number }>
}

interface AlertRule {
  id: string
  name: string
  metric: string
  threshold: number
  condition: string
  severity: string
  enabled: boolean
}

export default function PerformanceAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  const [alerts, setAlerts] = useState<{ active: AlertRule[]; recent: any[] }>({ active: [], recent: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(24 * 60 * 60 * 1000) // 24 hours
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const { getAnalytics, trackUserEvent } = usePerformanceMonitor()

  useEffect(() => {
    loadAnalytics()
    trackUserEvent('performance_dashboard_viewed', { timeRange })

    if (realTimeEnabled) {
      const interval = setInterval(loadAnalytics, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [timeRange, realTimeEnabled])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const data = getAnalytics(timeRange)

      setMetrics(data.metrics)
      setCharts(data.charts)
      setAlerts(data.alerts)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = (format: 'json' | 'csv') => {
    try {
      const data = performanceMonitor.exportData(format, timeRange)
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-data-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      trackUserEvent('performance_data_exported', { format, timeRange })
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'warning': return 'text-yellow-600'
      case 'medium': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      warning: 'secondary',
      medium: 'outline',
      low: 'outline'
    }
    return variants[severity as keyof typeof variants] || 'outline'
  }

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading performance analytics...</p>
        </div>
      </div>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and performance insights • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="realtime"
              checked={realTimeEnabled}
              onCheckedChange={setRealTimeEnabled}
            />
            <label htmlFor="realtime" className="text-sm font-medium">
              Real-time updates
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportData('json')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => exportData('csv')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={loadAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[
          { label: '1H', value: 60 * 60 * 1000 },
          { label: '6H', value: 6 * 60 * 60 * 1000 },
          { label: '24H', value: 24 * 60 * 60 * 1000 },
          { label: '7D', value: 7 * 24 * 60 * 60 * 1000 },
          { label: '30D', value: 30 * 24 * 60 * 60 * 1000 }
        ].map(({ label, value }) => (
          <Button
            key={label}
            variant={timeRange === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatDuration(metrics.apiResponseTimes.avg)}</p>
                  <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  <p className="text-xs text-muted-foreground">
                    P95: {formatDuration(metrics.apiResponseTimes.p95)} • P99: {formatDuration(metrics.apiResponseTimes.p99)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground">Error Rate</p>
                  <div className="flex items-center gap-1 mt-1">
                    {metrics.errorRate > 5 ? (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    )}
                    <span className={`text-xs ${metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                      {metrics.errorRate > 5 ? 'Above threshold' : 'Within limits'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.activeUsers}</p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.userSessions} sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <Activity className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{alerts.active.length}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                  <div className="flex items-center gap-1 mt-1">
                    {alerts.active.length > 0 ? (
                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    <span className={`text-xs ${alerts.active.length > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {alerts.active.length > 0 ? 'Needs attention' : 'All systems normal'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors & Issues</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Monitoring</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Response Time Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.responseTimeChart && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={charts.responseTimeChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                      />
                      <YAxis tickFormatter={(value) => `${value}ms`} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value) => [`${value}ms`, 'Response Time']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Error Rate Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.errorRateChart && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={charts.errorRateChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                      />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value) => [`${value}%`, 'Error Rate']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#ff4444"
                        fill="#ff444420"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
                <CardDescription>API endpoints with highest average response times</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.slowestEndpoints && (
                  <div className="space-y-3">
                    {metrics.slowestEndpoints.slice(0, 5).map((endpoint, index) => (
                      <div key={`endpoint-${index}-${endpoint.endpoint}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{endpoint.endpoint}</p>
                          <p className="text-xs text-muted-foreground">{endpoint.count} requests</p>
                        </div>
                        <Badge variant="outline">
                          {formatDuration(endpoint.avgTime)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Error Messages</CardTitle>
                <CardDescription>Most frequent errors in the selected time range</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.topErrors && (
                  <div className="space-y-3">
                    {metrics.topErrors.slice(0, 5).map((error, index) => (
                      <div key={`error-${index}-${error.message.slice(0, 20)}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{error.message}</p>
                          <Badge variant={getSeverityBadge(error.severity)} className="mt-1">
                            {error.severity}
                          </Badge>
                        </div>
                        <Badge variant="outline">
                          {error.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="w-5 h-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.memoryUsageChart && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={charts.memoryUsageChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                      />
                      <YAxis tickFormatter={(value) => `${value}MB`} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value) => [`${value}MB`, 'Memory Usage']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00C49F"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.userActivityChart && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={charts.userActivityChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value) => [value, 'Active Users']}
                      />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>Detailed breakdown of system errors and issues</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.topErrors && (
                <div className="space-y-4">
                  {metrics.topErrors.map((error, index) => (
                    <div key={`detailed-error-${index}-${error.message.slice(0, 30)}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{error.message}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getSeverityBadge(error.severity)}>
                              {error.severity}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {error.count} occurrences
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Resolve
                        </Button>
                      </div>
                      <Progress value={Math.min((error.count / 100) * 100, 100)} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <span className="font-bold">{metrics?.activeUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sessions</span>
                    <span className="font-bold">{metrics?.userSessions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Session Duration</span>
                    <span className="font-bold">24m 15s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>User Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.userActivityChart && (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={charts.userActivityChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value) => [value, 'Active Users']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d820"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Active Alert Rules
              </CardTitle>
              <CardDescription>
                Configure monitoring thresholds and alert conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.active.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{rule.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {rule.metric} {rule.condition} {rule.threshold}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityBadge(rule.severity)}>
                        {rule.severity}
                      </Badge>
                      <Switch checked={rule.enabled} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
