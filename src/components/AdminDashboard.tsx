'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Shield,
  Users,
  Activity,
  TrendingUp,
  Server,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Container,
  Search,
  Filter,
  Download,
  RefreshCw,
  Settings,
  UserPlus,
  UserMinus,
  Ban,
  Mail,
  Eye,
  MoreHorizontal,
  Calendar,
  DollarSign
} from 'lucide-react'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalScans: number
  runningScans: number
  completedScans: number
  failedScans: number
  containerUtilization: number
  systemLoad: number
  memoryUsage: number
  diskUsage: number
}

interface User {
  id: string
  email: string
  full_name?: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
  last_seen?: string
  scan_count: number
  is_active: boolean
  is_banned: boolean
}

interface ScanStats {
  date: string
  scans: number
  users: number
  success_rate: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalScans: 0,
    runningScans: 0,
    completedScans: 0,
    failedScans: 0,
    containerUtilization: 0,
    systemLoad: 0,
    memoryUsage: 0,
    diskUsage: 0
  })
  const [users, setUsers] = useState<User[]>([])
  const [scanHistory, setScanHistory] = useState<ScanStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [userFilter, setUserFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadDashboardData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // Load system statistics
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Load users
      const usersResponse = await fetch('/api/admin/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      // Load scan history
      const historyResponse = await fetch('/api/admin/analytics/scans')
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setScanHistory(historyData.history || [])
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserStatus = async (userId: string, action: 'ban' | 'unban' | 'delete') => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (response.ok) {
        await loadDashboardData()
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error)
    }
  }

  const exportData = async (type: 'users' | 'scans' | 'analytics') => {
    try {
      const response = await fetch(`/api/admin/export?type=${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pentriarch-${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error(`Failed to export ${type}:`, error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(userFilter.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(userFilter.toLowerCase())
    const matchesPlan = planFilter === 'all' || user.plan === planFilter
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'banned' && user.is_banned) ||
                         (statusFilter === 'inactive' && !user.is_active && !user.is_banned)

    return matchesSearch && matchesPlan && matchesStatus
  })

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'pro':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (user: User) => {
    if (user.is_banned) return <Ban className="h-4 w-4 text-red-400" />
    if (user.is_active) return <CheckCircle className="h-4 w-4 text-green-400" />
    return <Clock className="h-4 w-4 text-yellow-400" />
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

  const planDistribution = [
    { name: 'Free', value: users.filter(u => u.plan === 'free').length },
    { name: 'Pro', value: users.filter(u => u.plan === 'pro').length },
    { name: 'Enterprise', value: users.filter(u => u.plan === 'enterprise').length }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400">System monitoring and user management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={loadDashboardData}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                  <p className="text-emerald-400 text-sm">
                    {stats.activeUsers} active
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Scans</p>
                  <p className="text-2xl font-bold text-white">{stats.totalScans}</p>
                  <p className="text-emerald-400 text-sm">
                    {stats.runningScans} running
                  </p>
                </div>
                <Activity className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">System Load</p>
                  <p className="text-2xl font-bold text-white">{stats.systemLoad}%</p>
                  <Progress value={stats.systemLoad} className="mt-2" />
                </div>
                <Cpu className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Container Usage</p>
                  <p className="text-2xl font-bold text-white">{stats.containerUtilization}%</p>
                  <Progress value={stats.containerUtilization} className="mt-2" />
                </div>
                <Container className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-emerald-600">
              <Users className="h-4 w-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600">
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-emerald-600">
              <Server className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scan Success Rate */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Scan Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Completed</span>
                      <span className="text-green-400">{stats.completedScans}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Failed</span>
                      <span className="text-red-400">{stats.failedScans}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Running</span>
                      <span className="text-blue-400">{stats.runningScans}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Distribution */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Memory Usage</span>
                      <span className="text-white">{stats.memoryUsage}%</span>
                    </div>
                    <Progress value={stats.memoryUsage} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Disk Usage</span>
                      <span className="text-white">{stats.diskUsage}%</span>
                    </div>
                    <Progress value={stats.diskUsage} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Container Load</span>
                      <span className="text-white">{stats.containerUtilization}%</span>
                    </div>
                    <Progress value={stats.containerUtilization} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* User Filters */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  User Management
                  <Button
                    onClick={() => exportData('users')}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-64">
                    <Input
                      placeholder="Search users..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800 border-b border-slate-700">
                        <tr>
                          <th className="text-left p-4 text-slate-300">User</th>
                          <th className="text-left p-4 text-slate-300">Plan</th>
                          <th className="text-left p-4 text-slate-300">Scans</th>
                          <th className="text-left p-4 text-slate-300">Status</th>
                          <th className="text-left p-4 text-slate-300">Last Seen</th>
                          <th className="text-left p-4 text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">{user.full_name || user.email}</p>
                                <p className="text-slate-400 text-sm">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className={getPlanColor(user.plan)}>
                                {user.plan}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="text-white">{user.scan_count}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(user)}
                                <span className="text-slate-300">
                                  {user.is_banned ? 'Banned' : user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-300">
                                {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateUserStatus(user.id, user.is_banned ? 'unban' : 'ban')}
                                  className="border-slate-600 text-slate-300"
                                >
                                  {user.is_banned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-slate-600 text-slate-300"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-slate-600 text-slate-300"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Scan Activity Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={scanHistory}>
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
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Database className="h-5 w-5 mr-2 text-emerald-400" />
                    Database Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Connection</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Total Tables</span>
                      <span className="text-white">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Total Records</span>
                      <span className="text-white">245,832</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Container className="h-5 w-5 mr-2 text-emerald-400" />
                    Container Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Running Containers</span>
                      <span className="text-white">{stats.runningScans}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Image Version</span>
                      <span className="text-white">v1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Registry</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        pentriarch/security-scanner
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Alerts */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.memoryUsage > 80 && (
                    <Alert className="border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-400">
                        High memory usage detected: {stats.memoryUsage}%
                      </AlertDescription>
                    </Alert>
                  )}
                  {stats.diskUsage > 85 && (
                    <Alert className="border-red-500/50 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-400">
                        Low disk space: {100 - stats.diskUsage}% remaining
                      </AlertDescription>
                    </Alert>
                  )}
                  {stats.containerUtilization > 90 && (
                    <Alert className="border-red-500/50 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-400">
                        Container utilization critical: {stats.containerUtilization}%
                      </AlertDescription>
                    </Alert>
                  )}
                  {stats.memoryUsage <= 80 && stats.diskUsage <= 85 && stats.containerUtilization <= 90 && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-400">
                        All systems operating normally
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
