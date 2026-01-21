'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { webSocketManager, type WebSocketMessage, type ScanProgress, type ContainerStatus, type NotificationData } from '@/lib/websocket'

interface UseWebSocketProps {
  userId: string
  onScanProgress?: (progress: ScanProgress) => void
  onContainerStatus?: (status: ContainerStatus) => void
  onNotification?: (notification: NotificationData) => void
  onScanComplete?: (result: unknown) => void
  onScanError?: (error: Error | string) => void
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connectionAttempts: number
  lastConnected: Date | null
}

export const useWebSocket = ({
  userId,
  onScanProgress,
  onContainerStatus,
  onNotification,
  onScanComplete,
  onScanError
}: UseWebSocketProps) => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionAttempts: 0,
    lastConnected: null
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionAttemptsRef = useRef(0)

  // Store callbacks in refs to avoid re-creating connect function
  const callbacksRef = useRef({
    onScanProgress,
    onContainerStatus,
    onNotification,
    onScanComplete,
    onScanError
  })

  // Update callbacks without triggering re-renders
  useEffect(() => {
    callbacksRef.current = {
      onScanProgress,
      onContainerStatus,
      onNotification,
      onScanComplete,
      onScanError
    }
  })

  const handleMessage = useCallback((message: WebSocketMessage) => {
    const callbacks = callbacksRef.current
    switch (message.type) {
      case 'scan_progress':
        callbacks.onScanProgress?.(message.data as ScanProgress)
        break
      case 'container_status':
        callbacks.onContainerStatus?.(message.data as ContainerStatus)
        break
      case 'notification':
        callbacks.onNotification?.(message.data as NotificationData)
        break
      case 'scan_complete':
        callbacks.onScanComplete?.(message.data)
        break
      case 'scan_error': {
        const errorMessage = typeof message.data === 'string'
          ? message.data
          : JSON.stringify(message.data)
        callbacks.onScanError?.(errorMessage)
        break
      }
    }
  }, []) // No dependencies to prevent recreation

  const connect = useCallback(() => {
    setState(prev => {
      if (prev.isConnecting || prev.isConnected) {
        return prev
      }

      connectionAttemptsRef.current += 1

      try {
        const ws = webSocketManager.connect(userId, handleMessage)
        if (ws) {
          wsRef.current = ws
        }

        return {
          ...prev,
          isConnecting: true,
          error: null,
          connectionAttempts: connectionAttemptsRef.current
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        return {
          ...prev,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Connection failed',
          connectionAttempts: connectionAttemptsRef.current
        }
      }
    })
  }, [userId, handleMessage]) // Only userId and stable handleMessage

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      webSocketManager.disconnect(userId)
      wsRef.current = null
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }))
  }, [userId])

  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    return webSocketManager.sendMessage(userId, message)
  }, [userId])

  // Subscribe to specific events
  const subscribeScan = useCallback((scanId: string) => {
    return webSocketManager.subscribeScan(userId, scanId)
  }, [userId])

  const subscribeContainer = useCallback((scanId?: string) => {
    return webSocketManager.subscribeContainer(userId, scanId)
  }, [userId])

  const subscribeNotifications = useCallback(() => {
    return webSocketManager.subscribeNotifications(userId)
  }, [userId])

  useEffect(() => {
    let mounted = true

    // Set up event listeners
    const handleConnected = () => {
      if (!mounted) return
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastConnected: new Date()
      }))
    }

    const handleDisconnected = () => {
      if (!mounted) return
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }))

      // Auto-reconnect after delay using exponential backoff
      const delay = Math.min(1000 * 2 ** connectionAttemptsRef.current, 30000)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!mounted) return
        // Check current state before attempting reconnection
        setState(currentState => {
          if (!currentState.isConnected && !currentState.isConnecting && mounted) {
            // Use requestAnimationFrame to avoid state update conflicts
            requestAnimationFrame(() => {
              if (mounted) connect()
            })
          }
          return currentState
        })
      }, delay)
    }

    const handleError = (error: Error | { message?: string }) => {
      if (!mounted) return
      setState(prev => ({
        ...prev,
        error: error.message || 'WebSocket error',
        isConnecting: false
      }))
    }

    const handleReconnectFailed = () => {
      if (!mounted) return
      setState(prev => ({
        ...prev,
        error: 'Failed to reconnect after multiple attempts',
        isConnecting: false
      }))
    }

    webSocketManager.on('connected', handleConnected)
    webSocketManager.on('disconnected', handleDisconnected)
    webSocketManager.on('error', handleError)
    webSocketManager.on('reconnect_failed', handleReconnectFailed)

    // Initial connection with delay to prevent immediate re-connection loops
    const initialConnectionTimer = setTimeout(() => {
      if (mounted) connect()
    }, 100)

    return () => {
      mounted = false
      clearTimeout(initialConnectionTimer)

      webSocketManager.off('connected', handleConnected)
      webSocketManager.off('disconnected', handleDisconnected)
      webSocketManager.off('error', handleError)
      webSocketManager.off('reconnect_failed', handleReconnectFailed)

      disconnect()
    }
  }, [connect, disconnect]) // Depend on the memoized functions

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connectionAttempts: state.connectionAttempts,
    lastConnected: state.lastConnected,
    connect,
    disconnect,
    sendMessage,
    subscribeScan,
    subscribeContainer,
    subscribeNotifications
  }
}
