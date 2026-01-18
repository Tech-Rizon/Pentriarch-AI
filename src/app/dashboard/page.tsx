'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Terminal, Activity, User, Settings, LogOut } from 'lucide-react'
import PromptConsole from '@/components/PromptConsole'
import ChatKitConsole from '@/components/ChatKitConsole'
import ScanDashboard from '@/components/ScanDashboard'
import SecurityWorkspace from '@/components/SecurityWorkspace'
import SettingsPage from '@/components/SettingsPage'
import { getCurrentUserClient, signOut } from '@/lib/supabase'

// ✅ Structurally typed interface
export interface AppUser extends Record<string, unknown> {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    plan?: string
  }
}

export default function Dashboard() {
  const chatKitEnabled = process.env.NEXT_PUBLIC_CHATKIT_ENABLED === 'true'
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('workspace')
  const router = useRouter()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser || !currentUser.email) {
        router.push('/auth')
        return
      }
      setUser(currentUser as AppUser)
    } catch (error) {
      console.error('Failed to load user:', error)
      router.push('/auth')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const handleSettingsClick = () => {
    setActiveTab('settings')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-emerald-400" />
                <h1 className="text-xl font-bold text-white">Pentriarch AI</h1>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Premium
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.email}</p>
                  <p className="text-xs text-slate-400 capitalize">
                    {user.user_metadata?.plan || 'Free'} Plan
                  </p>
                </div>
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white"
                  onClick={handleSettingsClick}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-slate-300 hover:text-white"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger
              value="workspace"
              className="flex items-center space-x-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Shield className="h-4 w-4" />
              <span>Security Workspace</span>
            </TabsTrigger>
            <TabsTrigger
              value="console"
              className="flex items-center space-x-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Terminal className="h-4 w-4" />
              <span>AI Console</span>
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="flex items-center space-x-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Activity className="h-4 w-4" />
              <span>Scan Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center space-x-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="space-y-6">
            <SecurityWorkspace />
          </TabsContent>

          <TabsContent value="console" className="space-y-6">
            {chatKitEnabled ? <ChatKitConsole /> : <PromptConsole />}
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
