// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map()

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(listener)
  }

  off(event: string, listener: (...args: any[]) => void) {
    const listeners = this.events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.forEach(listener => listener(...args))
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

export interface WebSocketMessage {
  type: 'scan_progress' | 'container_status' | 'notification' | 'scan_complete' | 'scan_error'
  scanId?: string
  userId?: string
  data: unknown // Accept any object type
  timestamp: string
}

export interface ScanProgress {
  scanId: string
  status: 'starting' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep: string
  output?: string
  estimatedTimeRemaining?: number
}

export interface ContainerStatus {
  scanId?: string
  containerId?: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  uptime?: string
  memoryUsage?: string
  cpuUsage?: string
}

export interface NotificationData {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'security'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

class WebSocketManager extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectAttempts: Map<string, number> = new Map()
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isWebSocketSupported = true

  constructor() {
    super()
    this.startHeartbeat()
  }

  // Client-side connection management with fallback
  connect(userId: string, onMessage?: (message: WebSocketMessage) => void): WebSocket | null {
    if (!this.isWebSocketSupported) {
      console.log('WebSocket not supported, using polling fallback')
      this.startPolling(userId, onMessage)
      return null
    }

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        this.connections.set(userId, ws)

        // Register user connection
        try {
          ws.send(JSON.stringify({
            type: 'register',
            userId,
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Failed to register WebSocket user:', error)
        }

        this.reconnectAttempts.set(userId, 0)
        this.emit('connected', userId)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.emit('message', message)
          if (onMessage) {
            onMessage(message)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          this.emit('error', { message: 'Invalid message format' })
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        this.connections.delete(userId)
        this.emit('disconnected', userId)

        // If it's an abnormal closure, try to reconnect
        if (event.code !== 1000 && event.code !== 1001) {
          this.handleReconnect(userId, onMessage)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.emit('error', error)

        // If WebSocket fails completely, fall back to polling
        if (this.reconnectAttempts.get(userId) === 0) {
          console.log('WebSocket failed, falling back to polling')
          this.isWebSocketSupported = false
          this.startPolling(userId, onMessage)
        }
      }

      return ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.isWebSocketSupported = false
      this.startPolling(userId, onMessage)
      return null
    }
  }

  // Polling fallback for when WebSocket is not available
  private startPolling(userId: string, onMessage?: (message: WebSocketMessage) => void) {
    // Clear any existing polling for this user
    this.stopPolling(userId)

    // Simulate connection
    setTimeout(() => {
      this.emit('connected', userId)
    }, 100)

    // Poll for updates every 2 seconds
    const interval = setInterval(async () => {
      try {
        // Poll for scan status updates
        const response = await fetch('/api/status')
        if (response.ok) {
          const data = await response.json()

          // Simulate WebSocket messages for active scans
          if (data.activeScans && data.activeScans.length > 0) {
            for (const scan of data.activeScans) {
              const message: WebSocketMessage = {
                type: 'scan_progress',
                scanId: scan.id,
                userId,
                data: {
                  scanId: scan.id,
                  status: scan.status,
                  progress: scan.progress || 0,
                  currentStep: scan.current_step || 'Running...',
                  output: scan.latest_output
                },
                timestamp: new Date().toISOString()
              }

              if (onMessage) {
                onMessage(message)
              }
              this.emit('message', message)
            }
          }
        }
      } catch (error) {
        // Silently handle polling errors to avoid spam
        console.debug('Polling error:', error)
      }
    }, 2000)

    this.pollingIntervals.set(userId, interval)
  }

  private stopPolling(userId: string) {
    const interval = this.pollingIntervals.get(userId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(userId)
    }
  }

  private handleReconnect(userId: string, onMessage?: (message: WebSocketMessage) => void) {
    const attempts = this.reconnectAttempts.get(userId) || 0

    if (attempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached for user', userId)
      this.emit('reconnect_failed', userId)
      // Fall back to polling
      this.isWebSocketSupported = false
      this.startPolling(userId, onMessage)
      return
    }

    const delay = Math.min(this.reconnectDelay * 2 ** attempts, 30000)
    this.reconnectAttempts.set(userId, attempts + 1)

    setTimeout(() => {
      console.log(`Attempting to reconnect (${attempts + 1}/${this.maxReconnectAttempts})`)
      this.connect(userId, onMessage)
    }, delay)
  }

  disconnect(userId: string): boolean {
    this.stopPolling(userId)

    const ws = this.connections.get(userId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Client disconnect')
      this.connections.delete(userId)
      return true
    }

    // Even if no WebSocket, emit disconnected for polling fallback
    this.emit('disconnected', userId)
    return false
  }

  // Send messages to server
  sendMessage(userId: string, message: Partial<WebSocketMessage>) {
    const ws = this.connections.get(userId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }))
      return true
    }
    return false
  }

  // Subscribe to specific scan updates
  subscribeScan(userId: string, scanId: string) {
    return this.sendMessage(userId, {
      type: 'scan_progress',
      scanId,
      data: { action: 'subscribe' }
    })
  }

  // Unsubscribe from scan updates
  unsubscribeScan(userId: string, scanId: string) {
    return this.sendMessage(userId, {
      type: 'scan_progress',
      scanId,
      data: { action: 'unsubscribe' }
    })
  }

  // Subscribe to container updates
  subscribeContainer(userId: string, scanId?: string) {
    return this.sendMessage(userId, {
      type: 'container_status',
      scanId,
      data: { action: 'subscribe' }
    })
  }

  // Subscribe to notifications
  subscribeNotifications(userId: string) {
    return this.sendMessage(userId, {
      type: 'notification',
      data: { action: 'subscribe' }
    })
  }

  // Get connection status
  isConnected(userId: string): boolean {
    const ws = this.connections.get(userId)
    return ws?.readyState === WebSocket.OPEN
  }

  // Get all connected users
  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys()).filter(userId => this.isConnected(userId))
  }

  // Heartbeat to keep connections alive
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((ws, userId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }))
        }
      })
    }, 30000) // Every 30 seconds
  }

  // Clean up
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.connections.forEach((ws, userId) => {
      this.disconnect(userId)
    })

    this.connections.clear()
    this.userConnections.clear()
    this.reconnectAttempts.clear()
  }
}

// Server-side WebSocket message broadcasting
export class WebSocketBroadcaster {
  private static instance: WebSocketBroadcaster
  private connections: Map<string, WebSocket> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()

  static getInstance(): WebSocketBroadcaster {
    if (!WebSocketBroadcaster.instance) {
      WebSocketBroadcaster.instance = new WebSocketBroadcaster()
    }
    return WebSocketBroadcaster.instance
  }

  addConnection(connectionId: string, userId: string, ws: WebSocket) {
    this.connections.set(connectionId, ws)

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId)?.add(connectionId)
  }

  removeConnection(connectionId: string, userId: string) {
    this.connections.delete(connectionId)
    this.userConnections.get(userId)?.delete(connectionId)

    if (this.userConnections.get(userId)?.size === 0) {
      this.userConnections.delete(userId)
    }
  }

  // Broadcast to specific user
  broadcastToUser(userId: string, message: WebSocketMessage) {
    const userConnectionIds = this.userConnections.get(userId)
    if (userConnectionIds) {
      for (const connectionId of userConnectionIds) {
        const ws = this.connections.get(connectionId)
        if (ws && ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify(message))
        }
      }
    }
  }

  // Broadcast to multiple users
  broadcastToUsers(userIds: string[], message: WebSocketMessage) {
    for (const userId of userIds) {
      this.broadcastToUser(userId, message)
    }
  }

  // Broadcast to all connected users
  broadcastToAll(message: WebSocketMessage) {
    for (const ws of this.connections.values()) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message))
      }
    }
  }

  // Broadcast scan progress
  broadcastScanProgress(scanId: string, userId: string, progress: ScanProgress) {
    this.broadcastToUser(userId, {
      type: 'scan_progress',
      scanId,
      userId,
      data: progress,
      timestamp: new Date().toISOString()
    })
  }

  // Broadcast container status
  broadcastContainerStatus(scanId: string, userId: string, status: ContainerStatus) {
    this.broadcastToUser(userId, {
      type: 'container_status',
      scanId,
      userId,
      data: status,
      timestamp: new Date().toISOString()
    })
  }

  // Broadcast notification
  broadcastNotification(userId: string, notification: NotificationData) {
    this.broadcastToUser(userId, {
      type: 'notification',
      userId,
      data: notification,
      timestamp: new Date().toISOString()
    })
  }

  // Broadcast scan completion
  broadcastScanComplete(scanId: string, userId: string, result: Record<string, unknown>) {
    this.broadcastToUser(userId, {
      type: 'scan_complete',
      scanId,
      userId,
      data: result,
      timestamp: new Date().toISOString()
    })
  }

  // Broadcast scan error
  broadcastScanError(scanId: string, userId: string, error: { message: string; code?: string; details?: Record<string, unknown> }) {
    this.broadcastToUser(userId, {
      type: 'scan_error',
      scanId,
      userId,
      data: error,
      timestamp: new Date().toISOString()
    })
  }
}

// Singleton instance for client-side usage
export const webSocketManager = new WebSocketManager()
