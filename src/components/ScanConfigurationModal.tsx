'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Settings,
  Target,
  Zap,
  Shield,
  Search,
  Globe,
  Database,
  Server,
  Check
} from 'lucide-react'
import { SECURITY_TOOLS } from '@/lib/toolsRouter'

interface ScanConfig {
  target: string
  tool: string
  prompt: string
  aiModel: string
  priority: 'low' | 'medium' | 'high'
  timeout: number
}

interface ScanConfigurationModalProps {
  scanConfig: ScanConfig
  setScanConfig: (config: ScanConfig) => void
  onStartScan: () => void
  isConnected: boolean
  disabled?: boolean
}

export function ScanConfigurationModal({
  scanConfig,
  setScanConfig,
  onStartScan,
  isConnected,
  disabled = false
}: ScanConfigurationModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const popularTools = [
    { id: 'nmap', name: 'Nmap', description: 'Network discovery', icon: Globe, usage: '95%' },
    { id: 'nikto', name: 'Nikto', description: 'Web vulnerability scanner', icon: Search, usage: '88%' },
    { id: 'sqlmap', name: 'SQLMap', description: 'SQL injection testing', icon: Database, usage: '82%' },
  ]

  const recommendedTools = [
    { id: 'gobuster', name: 'Gobuster', description: 'Directory brute force', icon: Server, usage: '90%' },
    { id: 'whatweb', name: 'WhatWeb', description: 'Web technology identification', icon: Target, usage: '85%' },
  ]

  const getToolIcon = (toolId: string) => {
    const iconMap = {
      nmap: Globe,
      nikto: Search,
      sqlmap: Database,
      gobuster: Server,
      whatweb: Target,
    }
    return iconMap[toolId] || Shield
  }

  const getUsageColor = (usage: string) => {
    const percent = Number.parseInt(usage)
    if (percent >= 90) return 'text-green-400'
    if (percent >= 80) return 'text-blue-400'
    return 'text-yellow-400'
  }

  const handleStartScan = () => {
    onStartScan()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20"
          disabled={disabled}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configure Scan
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            Scan Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target Input */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">Target</Label>
            <Input
              placeholder="IP, domain, or URL"
              value={scanConfig.target}
              onChange={(e) => setScanConfig({ ...scanConfig, target: e.target.value })}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Security Tools */}
          <div className="space-y-3">
            <Label className="text-slate-300 text-sm font-medium">Security Tools</Label>

            {/* Popular Tools */}
            <div>
              <h4 className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Popular Tools</h4>
              <div className="grid grid-cols-1 gap-2">
                {popularTools.map((tool) => {
                  const Icon = getToolIcon(tool.id)
                  const isSelected = scanConfig.tool === tool.id
                  return (
                    <Card
                      key={tool.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500/50 ring-1 ring-emerald-500/50'
                          : 'bg-slate-800/30 border-slate-700 hover:bg-slate-700/50'
                      }`}
                      onClick={() => setScanConfig({ ...scanConfig, tool: tool.id })}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <div>
                              <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {tool.name}
                              </div>
                              <div className="text-xs text-slate-500">{tool.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${getUsageColor(tool.usage)}`}>{tool.usage}</span>
                            {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Recommended Tools */}
            <div>
              <h4 className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Recommended</h4>
              <div className="grid grid-cols-1 gap-2">
                {recommendedTools.map((tool) => {
                  const Icon = getToolIcon(tool.id)
                  const isSelected = scanConfig.tool === tool.id
                  return (
                    <Card
                      key={tool.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500/50 ring-1 ring-emerald-500/50'
                          : 'bg-slate-800/30 border-slate-700 hover:bg-slate-700/50'
                      }`}
                      onClick={() => setScanConfig({ ...scanConfig, tool: tool.id })}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <div>
                              <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {tool.name}
                              </div>
                              <div className="text-xs text-slate-500">{tool.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${getUsageColor(tool.usage)}`}>{tool.usage}</span>
                            {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>

          {/* AI Prompt */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">Scan Objective</Label>
            <Textarea
              placeholder="Describe what you want to scan for..."
              value={scanConfig.prompt}
              onChange={(e) => setScanConfig({ ...scanConfig, prompt: e.target.value })}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleStartScan}
              disabled={!scanConfig.target || !scanConfig.tool || !isConnected}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Scan
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="text-center">
              <Badge variant="destructive" className="text-xs">
                Real-time updates unavailable
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
