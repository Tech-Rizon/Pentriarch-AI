'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Signal,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'

interface WebSocketStatusProps {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connectionAttempts: number
  lastConnected: Date | null
  onReconnect: () => void
  className?: string
  showDetails?: boolean
}

export default function WebSocketStatus({
  isConnected,
  isConnecting,
  error,
  connectionAttempts,
  lastConnected,
  onReconnect,
  className = '',
  showDetails = false
}: WebSocketStatusProps) {
  const [showPopover, setShowPopover] = useState(false)

  const getStatusIcon = () => {
    if (isConnecting) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
    }
    if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-400" />
    }
    if (error) {
      return <WifiOff className="h-4 w-4 text-red-400" />
    }
    return <WifiOff className="h-4 w-4 text-slate-400" />
  }

  const getStatusBadge = () => {
    if (isConnecting) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Connecting</Badge>
    }
    if (isConnected) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
    }
    if (error) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Disconnected</Badge>
    }
    return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Offline</Badge>
  }

  const getStatusText = () => {
    if (isConnecting) return 'Connecting to real-time updates...'
    if (isConnected) return 'Real-time updates active'
    if (error) return `Connection error: ${error}`
    return 'Real-time updates offline'
  }

  const getConnectionQuality = () => {
    if (!isConnected) return 'poor'
    if (connectionAttempts <= 1) return 'excellent'
    if (connectionAttempts <= 3) return 'good'
    return 'fair'
  }

  const getQualityIcon = () => {
    const quality = getConnectionQuality()
    switch (quality) {
      case 'excellent':
        return <Signal className="h-4 w-4 text-green-400" />
      case 'good':
        return <Signal className="h-4 w-4 text-blue-400" />
      case 'fair':
        return <Signal className="h-4 w-4 text-yellow-400" />
      default:
        return <Signal className="h-4 w-4 text-red-400" />
    }
  }

  // Compact status indicator for header/toolbar
  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-300 hover:text-white"
            >
              {getStatusIcon()}
              <span className="ml-1 text-xs">{isConnected ? 'Live' : 'Offline'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-slate-800 border-slate-700 text-white" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Real-time Connection</h4>
                {getStatusBadge()}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-300">{getStatusText()}</p>

                {lastConnected && (
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>Last connected: {format(lastConnected, 'MMM dd, HH:mm:ss')}</span>
                  </div>
                )}

                {connectionAttempts > 1 && (
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <RefreshCw className="h-3 w-3" />
                    <span>{connectionAttempts} connection attempts</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  {getQualityIcon()}
                  <span>Connection quality: {getConnectionQuality()}</span>
                </div>
              </div>

              {error && (
                <Alert className="bg-red-900/20 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {!isConnected && (
                <Button
                  onClick={onReconnect}
                  disabled={isConnecting}
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Reconnect
                    </>
                  )}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  // Detailed status card for dashboard/settings
  return (
    <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Real-time Connection</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{getStatusText()}</p>
            {lastConnected && (
              <p className="text-xs text-slate-400">
                Last connected: {format(lastConnected, 'MMM dd, yyyy HH:mm:ss')}
              </p>
            )}
          </div>
        </div>

        {/* Connection Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              {getQualityIcon()}
              <span className="text-xs text-slate-400">Quality</span>
            </div>
            <p className="text-sm font-medium text-white capitalize">{getConnectionQuality()}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <RefreshCw className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-400">Attempts</span>
            </div>
            <p className="text-sm font-medium text-white">{connectionAttempts}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-900/20 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Features */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium">Features:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-slate-300">Live scan progress</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-slate-300">Container monitoring</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-slate-300">Real-time notifications</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-slate-300">Auto-reconnection</span>
            </div>
          </div>
        </div>

        {/* Reconnect Button */}
        {!isConnected && (
          <Button
            onClick={onReconnect}
            disabled={isConnecting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Reconnect Now
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
