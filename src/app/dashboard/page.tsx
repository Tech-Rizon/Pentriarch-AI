'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Terminal, Activity, User, Settings, LogOut } from 'lucide-react'
import PromptConsole from '@/components/PromptConsole'
import ScanDashboard from '@/components/ScanDashboard'
import SecurityWorkspace from '@/components/SecurityWorkspace'
import SettingsPage from '@/components/SettingsPage'
import { signOut } from '@/lib/supabase'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('workspace')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth') // Redirect guests
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Pentriarch AI</h1>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Premium
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.email}</p>
                <p className="text-xs text-slate-400 capitalize">
                  {user.user_metadata?.plan || 'Free'} Plan
                </p>
              </div>
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white"
                onClick={async () => {
                  await signOut()
                  router.push('/')
                }}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700 mb-6">
            {[
              { value: 'workspace', label: 'Security Workspace', icon: Shield },
              { value: 'console', label: 'AI Console', icon: Terminal },
              { value: 'dashboard', label: 'Scan Dashboard', icon: Activity },
              { value: 'settings', label: 'Settings', icon: Settings },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center space-x-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="workspace" className="space-y-6">
            <SecurityWorkspace />
          </TabsContent>
          <TabsContent value="console" className="space-y-6">
            <PromptConsole />
          </TabsContent>
          <TabsContent value="dashboard" className="space-y-6">
            <ScanDashboard />
          </TabsContent>
          <TabsContent value="settings" className="space-y-6">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
