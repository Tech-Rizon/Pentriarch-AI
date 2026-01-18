// Advanced Performance Monitoring and Analytics System for Pentriarch AI

interface PerformanceMetric {
  id: string
  timestamp: number
  type: 'api_response' | 'database_query' | 'ai_model' | 'user_action' | 'system_resource' | 'error'
  name: string
  value: number
  unit: 'ms' | 'mb' | 'percent' | 'count' | 'bytes'
  metadata?: Record<string, unknown>
  userId?: string
  sessionId?: string
}

interface ErrorEvent {
  id: string
  timestamp: number
  type: 'javascript' | 'api' | 'network' | 'auth' | 'ai_model'
  message: string
  stack?: string
  url?: string
  userId?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
  metadata?: Record<string, unknown>
}

interface UserAnalytic {
  id: string
  userId: string
  sessionId: string
  timestamp: number
  event: string
  properties: Record<string, unknown>
  page?: string
  feature?: string
  duration?: number
}

interface SystemMetrics {
  timestamp: number
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  active_connections: number
  queue_size: number
  response_time_avg: number
  error_rate: number
  uptime: number
}

interface AlertRule {
  id: string
  name: string
  metric: string
  threshold: number
  condition: 'above' | 'below' | 'equals'
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  cooldown: number // minutes
  lastTriggered?: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private errors: ErrorEvent[] = []
  private userAnalytics: UserAnalytic[] = []
  private systemMetrics: SystemMetrics[] = []
  private alertRules: AlertRule[] = []
  private sessionId: string
  private userId?: string
  private isEnabled = true
  private batchSize = 100
  private flushInterval = 30000 // 30 seconds
  private retentionDays = 30

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeDefaultAlerts()
    this.startPeriodicCollection()
    this.setupErrorHandlers()

    // Flush metrics periodically
    setInterval(() => this.flushMetrics(), this.flushInterval)
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Set the current user for analytics tracking
   */
  setUser(userId: string) {
    this.userId = userId
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    type: PerformanceMetric['type'],
    name: string,
    value: number,
    unit: PerformanceMetric['unit'],
    metadata?: Record<string, unknown>
  ) {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      name,
      value,
      unit,
      metadata,
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.metrics.push(metric)
    this.checkAlerts(metric)

    // Keep only recent metrics in memory
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000)
    }
  }

  /**
   * Record an error event
   */
  recordError(
    type: ErrorEvent['type'],
    message: string,
    severity: ErrorEvent['severity'] = 'medium',
    metadata?: Record<string, unknown>
  ) {
    const error: ErrorEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      message,
      severity,
      resolved: false,
      userId: this.userId,
      metadata
    }

    this.errors.push(error)

    // Auto-report critical errors
    if (severity === 'critical') {
      this.sendAlert(`Critical Error: ${message}`, 'critical')
    }

    console.error(`[Performance Monitor] ${type}: ${message}`, metadata)
  }

  /**
   * Track user analytics event
   */
  trackUserEvent(
    event: string,
    properties: Record<string, unknown> = {},
    feature?: string,
    duration?: number
  ) {
    if (!this.isEnabled || !this.userId) return

    const analytic: UserAnalytic = {
      id: this.generateId(),
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      event,
      properties,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      feature,
      duration
    }

    this.userAnalytics.push(analytic)
  }

  /**
   * Start timing an operation
   */
  startTiming(operationName: string): () => void {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      this.recordMetric('api_response', operationName, duration, 'ms', {
        operation: operationName
      })
    }
  }

  /**
   * Measure API response time
   */
  async measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const startTime = performance.now()

    try {
      const result = await apiCall()
      const duration = performance.now() - startTime

      this.recordMetric('api_response', `API: ${endpoint}`, duration, 'ms', {
        endpoint,
        status: 'success'
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      this.recordMetric('api_response', `API: ${endpoint}`, duration, 'ms', {
        endpoint,
        status: 'error'
      })

      this.recordError('api', `API call failed: ${endpoint}`, 'high', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }

  /**
   * Monitor memory usage
   */
  measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.recordMetric('system_resource', 'Memory Usage', memory.usedJSHeapSize, 'bytes', {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      })
    }
  }

  /**
   * Monitor page load performance
   */
  measurePageLoad() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (navigation) {
        this.recordMetric('user_action', 'Page Load Time', navigation.loadEventEnd - navigation.fetchStart, 'ms', {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        })
      }
    }
  }

  /**
   * Get performance analytics dashboard data
   */
  getAnalyticsDashboard(timeRange: number = 24 * 60 * 60 * 1000): {
    metrics: {
      apiResponseTimes: { avg: number; p95: number; p99: number }
      errorRate: number
      userSessions: number
      activeUsers: number
      topErrors: Array<{ message: string; count: number; severity: string }>
      slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>
    }
    charts: {
      responseTimeChart: Array<{ time: number; value: number }>
      errorRateChart: Array<{ time: number; value: number }>
      userActivityChart: Array<{ time: number; value: number }>
      memoryUsageChart: Array<{ time: number; value: number }>
    }
    alerts: {
      active: AlertRule[]
      recent: Array<{ rule: string; message: string; timestamp: number }>
    }
  } {
    const cutoff = Date.now() - timeRange
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff)
    const recentErrors = this.errors.filter(e => e.timestamp > cutoff)
    const recentAnalytics = this.userAnalytics.filter(a => a.timestamp > cutoff)

    // Calculate API response times
    const apiMetrics = recentMetrics.filter(m => m.type === 'api_response')
    const responseTimes = apiMetrics.map(m => m.value).sort((a, b) => a - b)
    const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0
    const p95ResponseTime = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0
    const p99ResponseTime = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0

    // Calculate error rate
    const totalRequests = apiMetrics.length
    const errorCount = recentErrors.filter(e => e.type === 'api').length
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

    // User metrics
    const uniqueSessions = new Set(recentAnalytics.map(a => a.sessionId)).size
    const uniqueUsers = new Set(recentAnalytics.map(a => a.userId)).size

    // Top errors
    const errorCounts = new Map<string, { count: number; severity: string }>()
    for (const error of recentErrors) {
      const existing = errorCounts.get(error.message) || { count: 0, severity: error.severity }
      errorCounts.set(error.message, {
        count: existing.count + 1,
        severity: error.severity
      })
    }
    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Slowest endpoints
    const endpointTimes = new Map<string, number[]>()
    for (const metric of apiMetrics) {
      const endpoint = metric.metadata?.endpoint as string || metric.name
      if (!endpointTimes.has(endpoint)) {
        endpointTimes.set(endpoint, [])
      }
      endpointTimes.get(endpoint)!.push(metric.value)
    }
    const slowestEndpoints = Array.from(endpointTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10)

    // Generate chart data
    const generateChart = (metrics: PerformanceMetric[], valueExtractor: (m: PerformanceMetric) => number) => {
      const hourly = new Map<number, number[]>()

      for (const metric of metrics) {
        const hour = Math.floor(metric.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
        if (!hourly.has(hour)) {
          hourly.set(hour, [])
        }
        hourly.get(hour)!.push(valueExtractor(metric))
      }

      return Array.from(hourly.entries())
        .map(([time, values]) => ({
          time,
          value: values.reduce((a, b) => a + b, 0) / values.length
        }))
        .sort((a, b) => a.time - b.time)
    }

    return {
      metrics: {
        apiResponseTimes: {
          avg: Math.round(avgResponseTime),
          p95: Math.round(p95ResponseTime),
          p99: Math.round(p99ResponseTime)
        },
        errorRate: Math.round(errorRate * 100) / 100,
        userSessions: uniqueSessions,
        activeUsers: uniqueUsers,
        topErrors,
        slowestEndpoints
      },
      charts: {
        responseTimeChart: generateChart(apiMetrics, m => m.value),
        errorRateChart: this.generateErrorRateChart(timeRange),
        userActivityChart: this.generateUserActivityChart(timeRange),
        memoryUsageChart: generateChart(
          recentMetrics.filter(m => m.name === 'Memory Usage'),
          m => m.value / (1024 * 1024) // Convert to MB
        )
      },
      alerts: {
        active: this.alertRules.filter(rule => rule.enabled),
        recent: this.getRecentAlerts()
      }
    }
  }

  /**
   * Export performance data for analysis
   */
  exportData(format: 'json' | 'csv' = 'json', timeRange?: number) {
    const cutoff = timeRange ? Date.now() - timeRange : 0
    const data = {
      metrics: this.metrics.filter(m => m.timestamp > cutoff),
      errors: this.errors.filter(e => e.timestamp > cutoff),
      userAnalytics: this.userAnalytics.filter(a => a.timestamp > cutoff),
      systemMetrics: this.systemMetrics.filter(s => s.timestamp > cutoff)
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2)
    } else {
      // Convert to CSV format
      return this.convertToCSV(data)
    }
  }

  // Private methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeDefaultAlerts() {
    this.alertRules = [
      {
        id: 'high_response_time',
        name: 'High API Response Time',
        metric: 'api_response',
        threshold: 5000,
        condition: 'above',
        severity: 'warning',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'error_rate',
        threshold: 5,
        condition: 'above',
        severity: 'critical',
        enabled: true,
        cooldown: 10
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        metric: 'memory_usage',
        threshold: 500 * 1024 * 1024, // 500MB
        condition: 'above',
        severity: 'warning',
        enabled: true,
        cooldown: 15
      }
    ]
  }

  private startPeriodicCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.measureMemoryUsage()
      this.collectSystemMetrics()
    }, 30000)

    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData()
    }, 60 * 60 * 1000)
  }

  private setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Catch JavaScript errors
      window.addEventListener('error', (event) => {
        this.recordError('javascript', event.message, 'high', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        })
      })

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.recordError('javascript', `Unhandled Promise Rejection: ${event.reason}`, 'high', {
          reason: event.reason
        })
      })
    }
  }

  private checkAlerts(metric: PerformanceMetric) {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      const now = Date.now()
      if (rule.lastTriggered && (now - rule.lastTriggered) < (rule.cooldown * 60 * 1000)) {
        continue // Still in cooldown
      }

      let shouldTrigger = false

      if (rule.metric === metric.name || rule.metric === metric.type) {
        switch (rule.condition) {
          case 'above':
            shouldTrigger = metric.value > rule.threshold
            break
          case 'below':
            shouldTrigger = metric.value < rule.threshold
            break
          case 'equals':
            shouldTrigger = metric.value === rule.threshold
            break
        }
      }

      if (shouldTrigger) {
        rule.lastTriggered = now
        this.sendAlert(
          `Alert: ${rule.name} - ${metric.name}: ${metric.value}${metric.unit}`,
          rule.severity
        )
      }
    }
  }

  private sendAlert(message: string, severity: string) {
    console.warn(`[PERFORMANCE ALERT - ${severity.toUpperCase()}] ${message}`)

    // In production, this would integrate with alerting services
    // like PagerDuty, Slack, email notifications, etc.
  }

  private collectSystemMetrics() {
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu_usage: 0, // Would be collected from system API
      memory_usage: 0,
      disk_usage: 0,
      active_connections: 0,
      queue_size: 0,
      response_time_avg: this.calculateAverageResponseTime(),
      error_rate: this.calculateCurrentErrorRate(),
      uptime: performance.now()
    }

    this.systemMetrics.push(metrics)
  }

  private calculateAverageResponseTime(): number {
    const recentMetrics = this.metrics
      .filter(m => m.type === 'api_response' && m.timestamp > Date.now() - 5 * 60 * 1000) // Last 5 minutes

    if (recentMetrics.length === 0) return 0

    return recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length
  }

  private calculateCurrentErrorRate(): number {
    const recentErrors = this.errors
      .filter(e => e.timestamp > Date.now() - 5 * 60 * 1000) // Last 5 minutes

    const recentRequests = this.metrics
      .filter(m => m.type === 'api_response' && m.timestamp > Date.now() - 5 * 60 * 1000)

    if (recentRequests.length === 0) return 0

    return (recentErrors.length / recentRequests.length) * 100
  }

  private generateErrorRateChart(timeRange: number) {
    const cutoff = Date.now() - timeRange
    const hourly = new Map<number, { errors: number; requests: number }>()

    // Group by hour
    for (const error of this.errors.filter(e => e.timestamp > cutoff)) {
      const hour = Math.floor(error.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
      if (!hourly.has(hour)) {
        hourly.set(hour, { errors: 0, requests: 0 })
      }
      hourly.get(hour)!.errors++
    }

    for (const metric of this.metrics.filter(m => m.type === 'api_response' && m.timestamp > cutoff)) {
      const hour = Math.floor(metric.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
      if (!hourly.has(hour)) {
        hourly.set(hour, { errors: 0, requests: 0 })
      }
      hourly.get(hour)!.requests++
    }

    return Array.from(hourly.entries())
      .map(([time, data]) => ({
        time,
        value: data.requests > 0 ? (data.errors / data.requests) * 100 : 0
      }))
      .sort((a, b) => a.time - b.time)
  }

  private generateUserActivityChart(timeRange: number) {
    const cutoff = Date.now() - timeRange
    const hourly = new Map<number, Set<string>>()

    for (const analytic of this.userAnalytics.filter(a => a.timestamp > cutoff)) {
      const hour = Math.floor(analytic.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
      if (!hourly.has(hour)) {
        hourly.set(hour, new Set())
      }
      hourly.get(hour)!.add(analytic.userId)
    }

    return Array.from(hourly.entries())
      .map(([time, users]) => ({
        time,
        value: users.size
      }))
      .sort((a, b) => a.time - b.time)
  }

  private getRecentAlerts(): Array<{ rule: string; message: string; timestamp: number }> {
    // This would typically come from a persistent store
    return []
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production would use a proper CSV library
    const lines = ['Type,Timestamp,Name,Value,Unit,UserId']

    for (const metric of data.metrics) {
      lines.push(`metric,${metric.timestamp},${metric.name},${metric.value},${metric.unit},${metric.userId || ''}`)
    }

    for (const error of data.errors) {
      lines.push(`error,${error.timestamp},${error.message},1,count,${error.userId || ''}`)
    }

    return lines.join('\n')
  }

  private async flushMetrics() {
    if (this.metrics.length === 0 && this.errors.length === 0 && this.userAnalytics.length === 0) {
      return
    }

    try {
      // In production, this would send to your analytics backend
      console.log(`[Performance Monitor] Flushing ${this.metrics.length} metrics, ${this.errors.length} errors, ${this.userAnalytics.length} analytics events`)

      // Reset local storage but keep some recent data
      this.metrics = this.metrics.slice(-1000)
      this.errors = this.errors.slice(-500)
      this.userAnalytics = this.userAnalytics.slice(-1000)

    } catch (error) {
      console.error('[Performance Monitor] Failed to flush metrics:', error)
    }
  }

  private cleanupOldData() {
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000)

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.errors = this.errors.filter(e => e.timestamp > cutoff)
    this.userAnalytics = this.userAnalytics.filter(a => a.timestamp > cutoff)
    this.systemMetrics = this.systemMetrics.filter(s => s.timestamp > cutoff)
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance()

  return {
    recordMetric: monitor.recordMetric.bind(monitor),
    recordError: monitor.recordError.bind(monitor),
    trackUserEvent: monitor.trackUserEvent.bind(monitor),
    startTiming: monitor.startTiming.bind(monitor),
    measureApiCall: monitor.measureApiCall.bind(monitor),
    getAnalytics: monitor.getAnalyticsDashboard.bind(monitor)
  }
}
