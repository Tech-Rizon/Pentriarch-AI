'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Shield,
  Target,
  Zap,
  Calendar,
  Activity,
  BarChart3,
  Server,
  Container
} from 'lucide-react'
import { getCurrentUserClient, getScansForUser, type Scan } from '@/lib/supabase'
import ContainerManager from './ContainerManager'

interface DashboardStats {
  totalScans: number
  completedScans: number
  failedScans: number
  runningScans: number
}

export default function ScanDashboard() {
  const [scans, setScans] = useState<Scan[]>([])
  const [filteredScans, setFilteredScans] = useState<Scan[]>([])
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    completedScans: 0,
    failedScans: 0,
    runningScans: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toolFilter, setToolFilter] = useState('all')
  const [selectedTab, setSelectedTab] = useState('scans')

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadScans()
    }
  }, [user])

  useEffect(() => {
    filterScans()
  }, [scans, searchQuery, statusFilter, toolFilter])

  const loadUser = async () => {
    try {
  const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const loadScans = async () => {
    try {
      setIsLoading(true)
      const userScans = await getScansForUser(user.id)
      setScans(userScans)

      // Calculate stats
      const stats: DashboardStats = {
        totalScans: userScans.length,
        completedScans: userScans.filter(s => s.status === 'completed').length,
        failedScans: userScans.filter(s => s.status === 'failed').length,
        runningScans: userScans.filter(s => s.status === 'running' || s.status === 'queued').length
      }
      setStats(stats)
    } catch (error) {
      console.error('Failed to load scans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterScans = () => {
    let filtered = scans

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.tool_used?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(scan => scan.status === statusFilter)
    }

    // Tool filter
    if (toolFilter !== 'all') {
      filtered = filtered.filter(scan => scan.tool_used === toolFilter)
    }

    setFilteredScans(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-400" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
    return variants[status as keyof typeof variants] || variants.cancelled
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)

    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const uniqueTools = [...new Set(scans.map(scan => scan.tool_used).filter(Boolean))]

  // Get running scans for container monitoring
  const runningScans = scans.filter(scan => scan.status === 'running' || scan.status === 'queued')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Scan Dashboard</h1>
              <p className="text-slate-400">Monitor your penetration testing activities</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={loadScans}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Zap className="h-4 w-4 mr-2" />
              New Scan
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Scans</CardTitle>
              <BarChart3 className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalScans}</div>
              <p className="text-xs text-slate-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.completedScans}</div>
              <p className="text-xs text-slate-400">
                {stats.totalScans > 0 ? Math.round((stats.completedScans / stats.totalScans) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Running</CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.runningScans}</div>
              <p className="text-xs text-slate-400">Active scans</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.failedScans}</div>
              <p className="text-xs text-slate-400">
                {stats.totalScans > 0 ? Math.round((stats.failedScans / stats.totalScans) * 100) : 0}% failure rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Container Monitoring Section - Show only when there are running scans */}
        {runningScans.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Container className="h-5 w-5 mr-2 text-emerald-400" />
                Active Container Monitoring ({runningScans.length})
              </CardTitle>
              <CardDescription className="text-slate-400">
                Real-time monitoring of security scanning containers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContainerManager />
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="scans" className="data-[state=active]:bg-emerald-600">
              <Activity className="h-4 w-4 mr-2" />
              Scans ({filteredScans.length})
            </TabsTrigger>
            <TabsTrigger value="containers" className="data-[state=active]:bg-emerald-600">
              <Server className="h-4 w-4 mr-2" />
              Containers ({runningScans.length})
            </TabsTrigger>
          </TabsList>

          {/* Scans Tab */}
          <TabsContent value="scans" className="space-y-6">
            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-emerald-400" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search targets, prompts, or tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={toolFilter} onValueChange={setToolFilter}>
                    <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Filter by tool" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Tools</SelectItem>
                      {uniqueTools.map(tool => (
                        <SelectItem key={tool} value={tool || ''}>{tool}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Scans Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-emerald-400" />
                    Recent Scans ({filteredScans.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  </div>
                ) : filteredScans.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No scans found</h3>
                    <p className="text-slate-400 mb-4">
                      {scans.length === 0
                        ? "Start your first penetration test to see results here."
                        : "Try adjusting your filters or search terms."
                      }
                    </p>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Zap className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredScans.map((scan) => (
                      <div key={scan.id} className="border border-slate-600 rounded-lg p-4 hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              {getStatusIcon(scan.status)}
                              <h3 className="text-lg font-medium text-white truncate">
                                {scan.target}
                              </h3>
                              <Badge className={getStatusBadge(scan.status)}>
                                {scan.status}
                              </Badge>
                              {scan.tool_used && (
                                <Badge variant="outline" className="border-slate-500 text-slate-300">
                                  {scan.tool_used}
                                </Badge>
                              )}
                              <Badge variant="outline" className="border-slate-500 text-slate-300">
                                {scan.ai_model}
                              </Badge>
                            </div>

                            <p className="text-slate-300 mb-3 line-clamp-2">
                              {scan.prompt}
                            </p>

                            <div className="flex items-center space-x-6 text-sm text-slate-400">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(scan.created_at)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatDuration(scan.start_time, scan.end_time)}</span>
                              </div>
                              {typeof scan.metadata?.risk_assessment === 'string' && (
                                <div className="flex items-center space-x-1">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>Risk: {scan.metadata.risk_assessment}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {scan.status === 'completed' && (
                              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                                <Download className="h-4 w-4 mr-1" />
                                Export
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Containers Tab - Dedicated container management view */}
          <TabsContent value="containers" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Server className="h-5 w-5 mr-2 text-emerald-400" />
                  Container Management
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Monitor and manage all active security scanning containers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContainerManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
