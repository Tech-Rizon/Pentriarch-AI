'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Eye,
  FileText,
  Trash2,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  Database,
  Server,
  Globe,
  Fingerprint,
  Key,
  LogIn,
  LogOut,
  Edit,
  Plus,
  Minus,
  Archive,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface AuditEvent {
  id: string
  timestamp: string
  user_id: string
  user_email: string
  action: string
  resource_type: string
  resource_id?: string
  ip_address: string
  user_agent: string
  details: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  compliance_tags: string[]
  outcome: 'success' | 'failure' | 'error'
}

interface ComplianceReport {
  framework: string
  controls: Array<{
    id: string
    name: string
    status: 'compliant' | 'non-compliant' | 'partial'
    evidence: number
    lastReview: string
  }>
  overallScore: number
  totalControls: number
  compliantControls: number
}

interface AuditStats {
  totalEvents: number
  todayEvents: number
  failedLogins: number
  adminActions: number
  dataAccess: number
  configChanges: number
  eventsByCategory: Array<{ category: string; count: number }>
  eventsBySeverity: Array<{ severity: string; count: number }>
  eventsTrend: Array<{ date: string; events: number; failed: number }>
}

export default function AuditTrail() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [compliance, setCompliance] = useState<ComplianceReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('events')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalEvents, setTotalEvents] = useState(0)

  useEffect(() => {
    loadAuditData()
  }, [currentPage, pageSize, searchQuery, severityFilter, categoryFilter, outcomeFilter, userFilter, dateRange])

  const loadAuditData = async () => {
    try {
      setIsLoading(true)

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })

      if (searchQuery) params.append('search', searchQuery)
      if (severityFilter !== 'all') params.append('severity', severityFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (outcomeFilter !== 'all') params.append('outcome', outcomeFilter)
      if (userFilter) params.append('user', userFilter)
      if (dateRange.from) params.append('from', dateRange.from.toISOString())
      if (dateRange.to) params.append('to', dateRange.to.toISOString())

      // Load audit events
      const eventsResponse = await fetch(`/api/audit?${params}`)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setEvents(eventsData.events || [])
        setTotalEvents(eventsData.total || 0)
      }

      // Load statistics
      const statsResponse = await fetch('/api/audit/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Load compliance data
      const complianceResponse = await fetch('/api/audit/compliance')
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json()
        setCompliance(complianceData.frameworks || [])
      }

    } catch (error) {
      console.error('Failed to load audit data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportAuditLogs = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        ...(searchQuery && { search: searchQuery }),
        ...(severityFilter !== 'all' && { severity: severityFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(outcomeFilter !== 'all' && { outcome: outcomeFilter }),
        ...(userFilter && { user: userFilter }),
        ...(dateRange.from && { from: dateRange.from.toISOString() }),
        ...(dateRange.to && { to: dateRange.to.toISOString() })
      })

      const response = await fetch(`/api/audit/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-trail-${format}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error(`Failed to export audit logs as ${format}:`, error)
    }
  }

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'authentication':
        return <Key className="h-4 w-4 text-blue-400" />
      case 'authorization':
        return <Lock className="h-4 w-4 text-purple-400" />
      case 'data_access':
        return <Database className="h-4 w-4 text-green-400" />
      case 'configuration':
        return <Settings className="h-4 w-4 text-yellow-400" />
      case 'user_management':
        return <UserCheck className="h-4 w-4 text-indigo-400" />
      case 'system':
        return <Server className="h-4 w-4 text-gray-400" />
      case 'network':
        return <Globe className="h-4 w-4 text-cyan-400" />
      case 'security':
        return <Shield className="h-4 w-4 text-red-400" />
      default:
        return <Activity className="h-4 w-4 text-slate-400" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>
      case 'low':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
      default:
        return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  const getComplianceStatus = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Compliant</Badge>
      case 'non-compliant':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Non-Compliant</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Partial</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSeverityFilter('all')
    setCategoryFilter('all')
    setOutcomeFilter('all')
    setUserFilter('')
    setDateRange({})
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalEvents / pageSize)

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

  if (isLoading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading audit trail...</p>
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
              <h1 className="text-3xl font-bold text-white">Audit Trail</h1>
              <p className="text-slate-400">Security events and compliance monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={loadAuditData}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Select value="csv" onValueChange={(value) => exportAuditLogs(value as 'csv' | 'json' | 'pdf')}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Events</p>
                    <p className="text-2xl font-bold text-white">{stats.totalEvents.toLocaleString()}</p>
                    <p className="text-blue-400 text-sm">{stats.todayEvents} today</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Failed Logins</p>
                    <p className="text-2xl font-bold text-white">{stats.failedLogins}</p>
                    <p className="text-red-400 text-sm">security events</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Admin Actions</p>
                    <p className="text-2xl font-bold text-white">{stats.adminActions}</p>
                    <p className="text-yellow-400 text-sm">privileged operations</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Data Access</p>
                    <p className="text-2xl font-bold text-white">{stats.dataAccess}</p>
                    <p className="text-green-400 text-sm">database queries</p>
                  </div>
                  <Database className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="events" className="data-[state=active]:bg-emerald-600">
              <Activity className="h-4 w-4 mr-2" />
              Events ({totalEvents})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600">
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-emerald-600">
              <FileText className="h-4 w-4 mr-2" />
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Filter Events</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="border-slate-600 text-slate-300"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search" className="text-slate-300">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="severity" className="text-slate-300">Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-slate-300">Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="authentication">Authentication</SelectItem>
                        <SelectItem value="authorization">Authorization</SelectItem>
                        <SelectItem value="data_access">Data Access</SelectItem>
                        <SelectItem value="configuration">Configuration</SelectItem>
                        <SelectItem value="user_management">User Management</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="network">Network</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="outcome" className="text-slate-300">Outcome</Label>
                    <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all">All Outcomes</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failure">Failure</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label htmlFor="user-filter" className="text-slate-300">User</Label>
                    <Input
                      id="user-filter"
                      placeholder="Filter by user..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => setDateRange(range || {})}
                          numberOfMonths={2}
                          className="bg-slate-800 text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="page-size" className="text-slate-300">Items per page</Label>
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number.parseInt(value))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Events Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Timestamp</TableHead>
                        <TableHead className="text-slate-300">Event</TableHead>
                        <TableHead className="text-slate-300">User</TableHead>
                        <TableHead className="text-slate-300">Category</TableHead>
                        <TableHead className="text-slate-300">Severity</TableHead>
                        <TableHead className="text-slate-300">Outcome</TableHead>
                        <TableHead className="text-slate-300">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id} className="border-slate-700 hover:bg-slate-700/30">
                          <TableCell className="text-slate-300">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <div>
                                <div className="text-sm">{format(new Date(event.timestamp), 'MMM dd, HH:mm')}</div>
                                <div className="text-xs text-slate-500">{format(new Date(event.timestamp), 'yyyy')}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="flex items-center space-x-2">
                              {getEventIcon(event.category)}
                              <div>
                                <div className="font-medium">{event.action}</div>
                                {event.resource_type && (
                                  <div className="text-xs text-slate-400">{event.resource_type}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <div>
                                <div className="text-sm">{event.user_email}</div>
                                <div className="text-xs text-slate-500">{event.ip_address}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {event.category.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getSeverityBadge(event.severity)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getOutcomeIcon(event.outcome)}
                              <span className="text-slate-300 capitalize">{event.outcome}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-600 text-slate-300"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEvents)} of {totalEvents} events
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-300"
                    >
                      Previous
                    </Button>
                    <span className="text-slate-300 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-300"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Events by Category */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Events by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.eventsByCategory ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.eventsByCategory}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ category, count }) => `${category}: ${count}`}
                        >
                          {stats.eventsByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Events by Severity */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Events by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.eventsBySeverity ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.eventsBySeverity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="severity" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Events Trend */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Events Trend (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.eventsTrend ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={stats.eventsTrend}>
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
                      <Line type="monotone" dataKey="events" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16">
                    <Activity className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="space-y-6">
              {compliance.map((framework) => (
                <Card key={framework.framework} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-emerald-400" />
                        {framework.framework} Compliance
                      </CardTitle>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{framework.overallScore}%</div>
                          <div className="text-sm text-slate-400">Overall Score</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">{framework.totalControls}</div>
                        <div className="text-sm text-slate-400">Total Controls</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-400">{framework.compliantControls}</div>
                        <div className="text-sm text-slate-400">Compliant</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-400">
                          {framework.totalControls - framework.compliantControls}
                        </div>
                        <div className="text-sm text-slate-400">Non-Compliant</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {framework.controls.slice(0, 5).map((control) => (
                        <div key={control.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">{control.id}</span>
                              {getComplianceStatus(control.status)}
                            </div>
                            <p className="text-slate-300 text-sm mt-1">{control.name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-400">{control.evidence} evidence items</div>
                            <div className="text-xs text-slate-500">
                              Last review: {format(new Date(control.lastReview), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {framework.controls.length > 5 && (
                      <div className="text-center mt-4">
                        <Button variant="outline" className="border-slate-600 text-slate-300">
                          View All {framework.controls.length} Controls
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {compliance.length === 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="text-center py-16">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Compliance Data</h3>
                    <p className="text-slate-400 mb-4">
                      Configure compliance frameworks to track your security posture
                    </p>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Configure Frameworks
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
