'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Search,
  Filter,
  Check,
  X,
  Trash2,
  Archive,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Save,
  RefreshCw,
  Volume2,
  VolumeX,
  Calendar,
  User,
  Shield,
  Activity,
  Database,
  Server,
  Network,
  Zap,
  Star,
  Bookmark,
  Flag,
  MoreHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'security'
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  read: boolean
  archived: boolean
  starred: boolean
  created_at: string
  expires_at?: string
  action_url?: string
  action_text?: string
  metadata: Record<string, any>
  user_id: string
}

interface NotificationSettings {
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  desktop_enabled: boolean
  sound_enabled: boolean
  categories: Record<string, {
    enabled: boolean
    email: boolean
    push: boolean
    sms: boolean
  }>
  quiet_hours: {
    enabled: boolean
    start: string
    end: string
  }
  digest: {
    enabled: boolean
    frequency: 'daily' | 'weekly'
    time: string
  }
}

interface NotificationStats {
  total: number
  unread: number
  today: number
  byType: Array<{ type: string; count: number }>
  byCategory: Array<{ category: string; count: number }>
  recentActivity: Array<{ date: string; count: number }>
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('all')

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')

  // Selection and bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // UI states
  const [showSettings, setShowSettings] = useState(false)
  const [testNotification, setTestNotification] = useState('')

  useEffect(() => {
    loadNotifications()
    loadSettings()
    loadStats()

    // Set up real-time updates
    const interval = setInterval(loadNotifications, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [searchQuery, typeFilter, categoryFilter, priorityFilter, readFilter])

  const loadNotifications = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (readFilter !== 'all') params.append('read', readFilter)

      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || getDefaultSettings())
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
      setSettings(getDefaultSettings())
    }
  }

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load notification stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', ids })
      })
      await loadNotifications()
      await loadStats()
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const markAsUnread = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_unread', ids })
      })
      await loadNotifications()
      await loadStats()
    } catch (error) {
      console.error('Failed to mark notifications as unread:', error)
    }
  }

  const toggleStar = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_star', ids: [id] })
      })
      await loadNotifications()
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const archiveNotifications = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', ids })
      })
      await loadNotifications()
      await loadStats()
    } catch (error) {
      console.error('Failed to archive notifications:', error)
    }
  }

  const deleteNotifications = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      await loadNotifications()
      await loadStats()
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to delete notifications:', error)
    }
  }

  const updateSettings = async (newSettings: NotificationSettings) => {
    try {
      await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      })
      setSettings(newSettings)
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  const sendTestNotification = async () => {
    try {
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testNotification || 'Test notification' })
      })
      setTestNotification('')
      await loadNotifications()
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  const getDefaultSettings = (): NotificationSettings => ({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    desktop_enabled: true,
    sound_enabled: true,
    categories: {
      security: { enabled: true, email: true, push: true, sms: true },
      scans: { enabled: true, email: true, push: true, sms: false },
      system: { enabled: true, email: false, push: true, sms: false },
      account: { enabled: true, email: true, push: false, sms: false }
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    digest: {
      enabled: false,
      frequency: 'daily',
      time: '09:00'
    }
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      case 'error':
        return <X className="h-5 w-5 text-red-400" />
      case 'security':
        return <Shield className="h-5 w-5 text-red-400" />
      default:
        return <Info className="h-5 w-5 text-blue-400" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="h-4 w-4 text-red-400" />
      case 'scans':
        return <Activity className="h-4 w-4 text-green-400" />
      case 'system':
        return <Server className="h-4 w-4 text-blue-400" />
      case 'account':
        return <User className="h-4 w-4 text-purple-400" />
      case 'billing':
        return <Database className="h-4 w-4 text-yellow-400" />
      default:
        return <Bell className="h-4 w-4 text-slate-400" />
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (selectedTab) {
      case 'unread':
        return !notification.read
      case 'starred':
        return notification.starred
      case 'archived':
        return notification.archived
      default:
        return !notification.archived
    }
  })

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    setSelectAll(newSelected.size === filteredNotifications.length)
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bell className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              <p className="text-slate-400">
                Stay updated with real-time alerts and system events
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={loadNotifications}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Notification Settings</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Configure how and when you receive notifications
                  </DialogDescription>
                </DialogHeader>
                {settings && (
                  <div className="space-y-6">
                    {/* Delivery Methods */}
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Delivery Methods</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-blue-400" />
                            <span>Email Notifications</span>
                          </div>
                          <Switch
                            checked={settings.email_enabled}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, email_enabled: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-4 w-4 text-green-400" />
                            <span>Push Notifications</span>
                          </div>
                          <Switch
                            checked={settings.push_enabled}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, push_enabled: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4 text-purple-400" />
                            <span>SMS Notifications</span>
                          </div>
                          <Switch
                            checked={settings.sms_enabled}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, sms_enabled: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Volume2 className="h-4 w-4 text-yellow-400" />
                            <span>Sound Alerts</span>
                          </div>
                          <Switch
                            checked={settings.sound_enabled}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, sound_enabled: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Categories</h4>
                      <div className="space-y-3">
                        {Object.entries(settings.categories).map(([category, config]) => (
                          <div key={category} className="p-3 bg-slate-700/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getCategoryIcon(category)}
                                <span className="capitalize">{category}</span>
                              </div>
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={(checked) =>
                                  setSettings({
                                    ...settings,
                                    categories: {
                                      ...settings.categories,
                                      [category]: { ...config, enabled: checked }
                                    }
                                  })
                                }
                              />
                            </div>
                            {config.enabled && (
                              <div className="flex space-x-4 text-sm">
                                <label className="flex items-center space-x-1">
                                  <Checkbox
                                    checked={config.email}
                                    onCheckedChange={(checked) =>
                                      setSettings({
                                        ...settings,
                                        categories: {
                                          ...settings.categories,
                                          [category]: { ...config, email: checked as boolean }
                                        }
                                      })
                                    }
                                  />
                                  <span>Email</span>
                                </label>
                                <label className="flex items-center space-x-1">
                                  <Checkbox
                                    checked={config.push}
                                    onCheckedChange={(checked) =>
                                      setSettings({
                                        ...settings,
                                        categories: {
                                          ...settings.categories,
                                          [category]: { ...config, push: checked as boolean }
                                        }
                                      })
                                    }
                                  />
                                  <span>Push</span>
                                </label>
                                <label className="flex items-center space-x-1">
                                  <Checkbox
                                  checked={config.sms}
                                  onCheckedChange={(checked: boolean) =>
                                    setSettings({
                                    ...settings,
                                    categories: {
                                      ...settings.categories,
                                      [category]: { ...config, sms: checked }
                                    }
                                    })
                                  }
                                  />
                                  <span>SMS</span>
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Test Notification */}
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Test Notifications</h4>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Test message..."
                          value={testNotification}
                          onChange={(e) => setTestNotification(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button onClick={sendTestNotification} className="bg-emerald-600 hover:bg-emerald-700">
                          <Zap className="h-4 w-4 mr-2" />
                          Send Test
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    onClick={() => setShowSettings(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (settings) {
                        updateSettings(settings)
                        setShowSettings(false)
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Unread</p>
                    <p className="text-2xl font-bold text-white">{stats.unread}</p>
                  </div>
                  <BellOff className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Today</p>
                    <p className="text-2xl font-bold text-white">{stats.today}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Read Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.total > 0 ? Math.round(((stats.total - stats.unread) / stats.total) * 100) : 0}%
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="scans">Scans</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="all" className="data-[state=active]:bg-emerald-600">
                All ({notifications.filter(n => !n.archived).length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="data-[state=active]:bg-emerald-600">
                Unread ({notifications.filter(n => !n.read && !n.archived).length})
              </TabsTrigger>
              <TabsTrigger value="starred" className="data-[state=active]:bg-emerald-600">
                Starred ({notifications.filter(n => n.starred && !n.archived).length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="data-[state=active]:bg-emerald-600">
                Archived ({notifications.filter(n => n.archived).length})
              </TabsTrigger>
            </TabsList>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm">{selectedIds.size} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(Array.from(selectedIds))}
                  className="border-slate-600 text-slate-300"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveNotifications(Array.from(selectedIds))}
                  className="border-slate-600 text-slate-300"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteNotifications(Array.from(selectedIds))}
                  className="border-red-600 text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <TabsContent value={selectedTab} className="space-y-4">
            {/* Select All */}
            {filteredNotifications.length > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-slate-800/30 rounded-lg">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-slate-300">Select all {filteredNotifications.length} notifications</span>
              </div>
            )}

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`bg-slate-800/50 border-slate-700 transition-all hover:bg-slate-800/70 ${
                      !notification.read ? 'border-l-4 border-l-emerald-400' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedIds.has(notification.id)}
                          onCheckedChange={() => handleSelectNotification(notification.id)}
                        />

                        <div className="flex-shrink-0">
                          {getTypeIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className={`text-lg font-medium ${notification.read ? 'text-slate-300' : 'text-white'}`}>
                                {notification.title}
                              </h3>
                              <p className="text-slate-400 mt-1">{notification.message}</p>

                              <div className="flex items-center space-x-4 mt-3">
                                <div className="flex items-center space-x-2">
                                  {getCategoryIcon(notification.category)}
                                  <span className="text-sm text-slate-400 capitalize">{notification.category}</span>
                                </div>
                                {getPriorityBadge(notification.priority)}
                                <span className="text-sm text-slate-500">
                                  {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStar(notification.id)}
                                className="text-slate-400 hover:text-yellow-400"
                              >
                                <Star className={`h-4 w-4 ${notification.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </Button>

                              {!notification.read ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead([notification.id])}
                                  className="text-slate-400 hover:text-green-400"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsUnread([notification.id])}
                                  className="text-slate-400 hover:text-blue-400"
                                >
                                  <EyeOff className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => archiveNotifications([notification.id])}
                                className="text-slate-400 hover:text-slate-300"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-slate-300"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {notification.action_url && notification.action_text && (
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
                              >
                                {notification.action_text}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="text-center py-16">
                    <Bell className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No notifications</h3>
                    <p className="text-slate-400">
                      {selectedTab === 'unread' ? 'All caught up!' :
                       selectedTab === 'starred' ? 'No starred notifications' :
                       selectedTab === 'archived' ? 'No archived notifications' :
                       'You have no notifications'}
                    </p>
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
