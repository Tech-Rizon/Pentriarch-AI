'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Send,
  Terminal,
  Brain,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Shield,
  Zap,
  Eye,
  Settings,
  Container,
  Activity
} from 'lucide-react'
import { getCurrentUser } from '@/lib/supabase'
import { webSocketManager, type WebSocketMessage } from '@/lib/websocket'
import ContainerManager from './ContainerManager'

interface ScanResult {
  scanId: string
  model: string
  suggestion: {
    tool: string
    reasoning: string
    confidence: number
    estimatedTime: number
    riskLevel: string
  }
  command: any
  status: 'queued' | 'running' | 'completed' | 'failed'
  timestamp: string
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system' | 'result'
  content: string
  timestamp: string
  scanResult?: ScanResult
}

export default function PromptConsole() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [target, setTarget] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('console')
  const [activeScanId, setActiveScanId] = useState<string | null>(null)
  const [containerStatus, setContainerStatus] = useState<any>(null)
  const [realTimeOutput, setRealTimeOutput] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sample prompts for guidance
  const samplePrompts = [
    "Scan example.com for common vulnerabilities",
    "Check if example.com has SQL injection vulnerabilities",
    "Run a WordPress security scan on myblog.com",
    "Perform directory enumeration on target.com",
    "Check what technologies are used on example.com"
  ]

  useEffect(() => {
    // Load user and initialize WebSocket
    getCurrentUser().then((userData) => {
      setUser(userData)

      if (userData?.id) {
        // Initialize WebSocket connection for real-time updates
        webSocketManager.connect(userData.id, handleWebSocketMessage)
        webSocketManager.subscribeNotifications(userData.id)
        webSocketManager.subscribeContainer(userData.id)
      }
    })

    // Initial welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      type: 'system',
      content: 'Welcome to Pentriarch AI! 🛡️ I\'m your AI-powered penetration testing assistant. Describe what you want to test and I\'ll recommend the best security tools and execute them safely in isolated containers.\n\n✨ **New Features:**\n• Real-time container monitoring\n• Live scan output streaming\n• WebSocket-powered updates',
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMessage])

    // Cleanup on unmount
    return () => {
      if (user?.id) {
        webSocketManager.disconnect(user.id)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle WebSocket messages for real-time updates
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'scan_progress':
        if (message.scanId === activeScanId) {
          const progress = message.data
          addMessage('system', `📊 **Scan Progress Update**\n\n**Status:** ${progress.status}\n**Progress:** ${progress.progress}%\n**Current Step:** ${progress.currentStep}`)

          if (progress.output) {
            setRealTimeOutput(prev => [...prev, progress.output])
          }
        }
        break

      case 'container_status':
        setContainerStatus(message.data)
        if (message.scanId === activeScanId) {
          addMessage('system', `🐳 **Container Status**\n\n**Status:** ${message.data.status}\n**Memory:** ${message.data.memoryUsage || 'N/A'}\n**CPU:** ${message.data.cpuUsage || 'N/A'}\n**Uptime:** ${message.data.uptime || 'N/A'}`)
        }
        break

      case 'scan_complete':
        if (message.scanId === activeScanId) {
          addMessage('result', `✅ **Scan Completed Successfully**\n\n**Duration:** ${message.data.duration || 'N/A'}ms\n**Exit Code:** ${message.data.exitCode || 0}\n\n**Final Output:**\n\`\`\`\n${realTimeOutput.join('\n')}\n\`\`\``)
          setActiveScanId(null)
          setRealTimeOutput([])
        }
        break

      case 'scan_error':
        if (message.scanId === activeScanId) {
          addMessage('system', `❌ **Scan Error**\n\n**Error:** ${message.data.error || 'Unknown error'}\n**Scan ID:** ${message.scanId}`)
          setActiveScanId(null)
          setRealTimeOutput([])
        }
        break

      case 'notification':
        const notification = message.data
        addMessage('system', `🔔 **${notification.title}**\n\n${notification.message}`)
        break
    }
  }

  const addMessage = (type: ChatMessage['type'], content: string, scanResult?: ScanResult) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date().toISOString(),
      scanResult
    }
    setMessages(prev => [...prev, message])
  }

  const handleScan = async () => {
    if (!input.trim() || !target.trim()) return

    const userMessage = `Target: ${target}\nPrompt: ${input}`
    addMessage('user', userMessage)

    setIsLoading(true)
    setInput('')

    try {
      // Send to AI for processing
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input,
          target: target,
          userPlan: user?.plan || 'free'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process scan')
      }

      // Add AI reasoning message
      const aiMessage = `🧠 **AI Analysis**

**Selected Tool:** ${data.suggestion.tool}
**Reasoning:** ${data.suggestion.reasoning}
**Confidence:** ${(data.suggestion.confidence * 100).toFixed(0)}%
**Risk Level:** ${data.suggestion.riskLevel}
**Estimated Time:** ${data.suggestion.estimatedTime}s
**Model Used:** ${data.model}

🚀 Executing command in secure container...`

      const scanResult: ScanResult = {
        scanId: data.scanId,
        model: data.model,
        suggestion: data.suggestion,
        command: data.command,
        status: 'running',
        timestamp: new Date().toISOString()
      }

      addMessage('ai', aiMessage, scanResult)

      // Set active scan and subscribe to real-time updates
      setActiveScanId(data.scanId)
      setRealTimeOutput([])

      if (user?.id) {
        webSocketManager.subscribeScan(user.id, data.scanId)
      }

      // Start polling for results (fallback for environments without WebSocket)
      pollScanStatus(data.scanId, scanResult)

    } catch (error: any) {
      addMessage('system', `❌ Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const pollScanStatus = async (scanId: string, scanResult: ScanResult) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    const poll = async () => {
      try {
        const response = await fetch(`/api/status/${scanId}`)
        const data = await response.json()

        if (data.scan.status === 'completed') {
          const output = data.logs
            .filter((log: any) => log.raw_output)
            .map((log: any) => log.raw_output)
            .join('\n')

          const resultMessage = `✅ **Scan Completed**

**Tool Output:**
\`\`\`
${output}
\`\`\`

**Duration:** ${scanResult.suggestion.estimatedTime}s
**Status:** Success`

          addMessage('result', resultMessage, { ...scanResult, status: 'completed' })

        } else if (data.scan.status === 'failed') {
          addMessage('system', `❌ Scan failed: ${data.scan.metadata?.execution_error || 'Unknown error'}`)

        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          addMessage('system', '⏱️ Scan timeout - please check your dashboard for results')
        }
      } catch (error) {
        console.error('Polling error:', error)
        addMessage('system', '❌ Failed to get scan status')
      }
    }

    poll()
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Pentriarch AI Console</h1>
              <p className="text-slate-400">AI-Powered Penetration Testing</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {user?.plan || 'Free'} Plan
            </Badge>
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Interface with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="console" className="data-[state=active]:bg-emerald-600">
              <Terminal className="h-4 w-4 mr-2" />
              AI Console
              {activeScanId && (
                <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Active
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="containers" className="data-[state=active]:bg-emerald-600">
              <Container className="h-4 w-4 mr-2" />
              Containers
              {containerStatus?.running && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Running
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Console Tab */}
          <TabsContent value="console">
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <Terminal className="h-5 w-5 mr-2 text-emerald-400" />
                    AI Console
                    {activeScanId && (
                      <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Scan: {activeScanId.slice(0, 8)}...
                      </Badge>
                    )}
                  </CardTitle>
                  {containerStatus && (
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-slate-400">
                        {containerStatus.exists ? 'Container Active' : 'No Container'}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
          <CardContent>
            {/* Messages */}
            <div className="h-96 overflow-y-auto mb-4 space-y-4 pr-2">
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col space-y-2">
                  <div className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user'
                        ? 'bg-emerald-600'
                        : message.type === 'ai'
                        ? 'bg-purple-600'
                        : message.type === 'result'
                        ? 'bg-green-600'
                        : 'bg-slate-600'
                    }`}>
                      {message.type === 'user' ? (
                        <Target className="h-4 w-4 text-white" />
                      ) : message.type === 'ai' ? (
                        <Brain className="h-4 w-4 text-white" />
                      ) : message.type === 'result' ? (
                        <CheckCircle className="h-4 w-4 text-white" />
                      ) : (
                        <Shield className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className={`flex-1 ${
                      message.type === 'user' ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                        message.type === 'user'
                          ? 'bg-emerald-600 text-white'
                          : message.type === 'ai'
                          ? 'bg-purple-600/20 border border-purple-500/30 text-purple-100'
                          : message.type === 'result'
                          ? 'bg-green-600/20 border border-green-500/30 text-green-100'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        {message.scanResult && (
                          <div className="mt-2 flex items-center space-x-2">
                            <Badge className={getRiskBadgeColor(message.scanResult.suggestion.riskLevel)}>
                              {message.scanResult.suggestion.riskLevel}
                            </Badge>
                            <Badge variant="outline" className="border-slate-500 text-slate-300">
                              {message.scanResult.suggestion.tool}
                            </Badge>
                            <Badge variant="outline" className="border-slate-500 text-slate-300">
                              {message.scanResult.model}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-purple-600/20 border border-purple-500/30 text-purple-100 p-3 rounded-lg">
                      <div className="text-sm">AI is analyzing your request...</div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  placeholder="Target domain or IP (e.g., example.com)"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Describe what you want to test (e.g., scan for SQL injection)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                  className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Button
                  onClick={handleScan}
                  disabled={isLoading || !input.trim() || !target.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Sample Prompts */}
            <div className="mt-4">
              <p className="text-sm text-slate-400 mb-2">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(prompt)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Containers Tab */}
      <TabsContent value="containers">
        <ContainerManager scanId={activeScanId} />
      </TabsContent>
    </Tabs>

        {/* Usage Warning */}
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            <strong>Legal Notice:</strong> Only test systems you own or have explicit permission to test.
            Unauthorized penetration testing is illegal and may result in criminal charges.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
