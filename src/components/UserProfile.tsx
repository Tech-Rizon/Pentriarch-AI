'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import {
  User,
  Mail,
  Calendar,
  Shield,
  Activity,
  Clock,
  Target,
  TrendingUp,
  Download,
  Settings,
  CreditCard,
  Star,
  CheckCircle,
  AlertTriangle,
  Crown,
  Zap,
  BarChart3,
  Trophy,
  Eye,
  EyeOff,
  Edit,
  Save,
  X
} from 'lucide-react'
import { getCurrentUserClient } from '@/lib/supabase'

interface UserData {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
  last_sign_in_at?: string
  scan_count: number
  scan_limit: number
  usage_this_month: number
  credits_remaining?: number
}

interface UsageStats {
  totalScans: number
  successfulScans: number
  failedScans: number
  averageExecutionTime: number
  favoriteTools: Array<{ tool: string; count: number }>
  scanHistory: Array<{ date: string; scans: number; success_rate: number }>
  monthlyUsage: Array<{ month: string; scans: number; quota: number }>
}

interface PlanFeatures {
  name: string
  price: string
  features: string[]
  limits: {
    scansPerMonth: number
    concurrentScans: number
    maxExecutionTime: number
    apiAccess: boolean
    customBranding: boolean
    priority: string
  }
}

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', email: '' })
  const [selectedTab, setSelectedTab] = useState('overview')

  useEffect(() => {
    loadUserProfile()
    loadUsageStats()
  }, [])

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (currentUser) {
        const userData: UserData = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name,
          avatar_url: currentUser.user_metadata?.avatar_url,
          plan: currentUser.raw_user_meta_data?.plan || 'free',
          created_at: currentUser.created_at,
          last_sign_in_at: currentUser.last_sign_in_at,
          scan_count: 0,
          scan_limit: getPlanLimits(currentUser.raw_user_meta_data?.plan || 'free').scansPerMonth,
          usage_this_month: 0,
          credits_remaining: currentUser.raw_user_meta_data?.credits
        }

        setUser(userData)
        setEditForm({
          full_name: userData.full_name || '',
          email: userData.email
        })
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/profile/stats')
      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    }
  }

  const updateProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        await loadUserProfile()
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const exportUserData = async () => {
    try {
      const response = await fetch('/api/profile/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pentriarch-profile-${user?.id}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export user data:', error)
    }
  }

  const getPlanLimits = (plan: string): PlanFeatures['limits'] => {
    switch (plan) {
      case 'enterprise':
        return {
          scansPerMonth: 1000,
          concurrentScans: 10,
          maxExecutionTime: 3600,
          apiAccess: true,
          customBranding: true,
          priority: 'highest'
        }
      case 'pro':
        return {
          scansPerMonth: 100,
          concurrentScans: 3,
          maxExecutionTime: 1800,
          apiAccess: true,
          customBranding: false,
          priority: 'high'
        }
      default:
        return {
          scansPerMonth: 10,
          concurrentScans: 1,
          maxExecutionTime: 900,
          apiAccess: false,
          customBranding: false,
          priority: 'normal'
        }
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30"><Crown className="h-3 w-3 mr-1" />Enterprise</Badge>
      case 'pro':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Zap className="h-3 w-3 mr-1" />Pro</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Free</Badge>
    }
  }

  const getUsagePercentage = () => {
    if (!user || !stats) return 0
    return Math.round((stats.totalScans / user.scan_limit) * 100)
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Alert className="border-red-500/50 bg-red-500/10 max-w-md">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            Failed to load user profile. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-emerald-600 text-white text-xl">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {user.full_name || 'User Profile'}
              </h1>
              <div className="flex items-center space-x-3 mt-1">
                <p className="text-slate-400">{user.email}</p>
                {getPlanBadge(user.plan)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="border-slate-600 text-slate-300"
            >
              {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
            <Button
              variant="outline"
              onClick={exportUserData}
              className="border-slate-600 text-slate-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full-name" className="text-slate-300">Full Name</Label>
                  <Input
                    id="full-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    disabled
                  />
                  <p className="text-slate-400 text-sm mt-1">Email cannot be changed</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateProfile}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Scans</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalScans || 0}</p>
                  <p className="text-emerald-400 text-sm">
                    {user.scan_limit - (stats?.totalScans || 0)} remaining
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-400" />
              </div>
              <Progress value={getUsagePercentage()} className="mt-3" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {stats ? Math.round((stats.successfulScans / Math.max(stats.totalScans, 1)) * 100) : 0}%
                  </p>
                  <p className="text-emerald-400 text-sm">
                    {stats?.successfulScans || 0} successful
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Avg. Execution</p>
                  <p className="text-2xl font-bold text-white">
                    {stats ? Math.round(stats.averageExecutionTime / 1000) : 0}s
                  </p>
                  <p className="text-blue-400 text-sm">per scan</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Member Since</p>
                  <p className="text-lg font-bold text-white">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-purple-400 text-sm">
                    {Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-emerald-600">
              <Activity className="h-4 w-4 mr-2" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="plan" className="data-[state=active]:bg-emerald-600">
              <CreditCard className="h-4 w-4 mr-2" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-emerald-600">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Favorite Tools */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Favorite Security Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.favoriteTools && stats.favoriteTools.length > 0 ? (
                    <div className="space-y-3">
                      {stats.favoriteTools.slice(0, 5).map((tool, index) => (
                        <div key={tool.tool} className="flex items-center justify-between">
                          <span className="text-slate-300">{tool.tool}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-emerald-400 h-2 rounded-full"
                                style={{ width: `${(tool.count / stats.favoriteTools[0].count) * 100}%` }}
                              />
                            </div>
                            <span className="text-white text-sm">{tool.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No scan data yet</p>
                      <p className="text-sm text-slate-500">Start scanning to see your favorite tools</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Account Status</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Current Plan</span>
                      {getPlanBadge(user.plan)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Last Login</span>
                      <span className="text-white">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Credits Remaining</span>
                      <span className="text-emerald-400">
                        {user.credits_remaining || 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.scanHistory && stats.scanHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={stats.scanHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="scans" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="success_rate" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16">
                    <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No usage data available</p>
                    <p className="text-sm text-slate-500 mt-2">Start running scans to see analytics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Current Plan Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Plan</span>
                      {getPlanBadge(user.plan)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Scans per Month</span>
                      <span className="text-white">{getPlanLimits(user.plan).scansPerMonth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Concurrent Scans</span>
                      <span className="text-white">{getPlanLimits(user.plan).concurrentScans}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Max Execution Time</span>
                      <span className="text-white">{getPlanLimits(user.plan).maxExecutionTime / 60}min</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">API Access</span>
                      {getPlanLimits(user.plan).apiAccess ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Custom Branding</span>
                      {getPlanLimits(user.plan).customBranding ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Priority Support</span>
                      <Badge variant="outline" className="capitalize">
                        {getPlanLimits(user.plan).priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                {user.plan === 'free' && (
                  <Alert className="mt-6 border-blue-500/50 bg-blue-500/10">
                    <Star className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-400">
                      <strong>Upgrade to Pro</strong> for unlimited scans, API access, and priority support.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                      <p className="text-slate-400 text-sm">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                      Enable 2FA
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">API Keys</h4>
                      <p className="text-slate-400 text-sm">Manage your API keys for external integrations</p>
                    </div>
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                      Manage Keys
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Session Management</h4>
                      <p className="text-slate-400 text-sm">View and manage your active sessions</p>
                    </div>
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                      View Sessions
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div>
                      <h4 className="text-red-400 font-medium">Delete Account</h4>
                      <p className="text-slate-400 text-sm">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="destructive">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
