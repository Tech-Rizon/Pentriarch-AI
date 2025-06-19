'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  User,
  Mail,
  Shield,
  Key,
  Bell,
  Settings,
  Crown,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { type UserRole, getRoleConfig, getUsagePercentage, getRemainingUsage } from '@/lib/rbac'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  created_at: string
}

interface UserUsage {
  scansThisMonth: number
  aiRequestsThisMonth: number
  reportExportsThisMonth: number
}

interface UserPreferences {
  emailNotifications: boolean
  scanNotifications: boolean
  securityAlerts: boolean
  darkMode: boolean
  autoSave: boolean
  twoFactorEnabled: boolean
}

export default function UserProfileManager() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [usage, setUsage] = useState<UserUsage>({
    scansThisMonth: 0,
    aiRequestsThisMonth: 0,
    reportExportsThisMonth: 0
  })
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    scanNotifications: true,
    securityAlerts: true,
    darkMode: true,
    autoSave: true,
    twoFactorEnabled: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadUserProfile()
    loadUserUsage()
    loadUserPreferences()
  }, [])

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      if (!user) throw new Error('No user found')

      setUser({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        role: (user.user_metadata?.plan as UserRole) || 'free',
        avatar_url: user.user_metadata?.avatar_url,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at
      })
    } catch (error: unknown) {
      setError(`Failed to load profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const loadUserUsage = async () => {
    try {
      // Mock usage data - in production, this would come from your database
      const mockUsage = {
        scansThisMonth: Math.floor(Math.random() * 50),
        aiRequestsThisMonth: Math.floor(Math.random() * 200),
        reportExportsThisMonth: Math.floor(Math.random() * 10)
      }
      setUsage(mockUsage)
    } catch (error: unknown) {
      console.error('Failed to load usage:', error)
    }
  }

  const loadUserPreferences = async () => {
    try {
      // Load from localStorage or database
      const stored = localStorage.getItem('userPreferences')
      if (stored) {
        setPreferences(JSON.parse(stored))
      }
    } catch (error: unknown) {
      console.error('Failed to load preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          avatar_url: updates.avatar_url
        }
      })

      if (error) throw error

      setUser(prev => prev ? { ...prev, ...updates } : null)
      setMessage('Profile updated successfully!')
    } catch (error: unknown) {
      setError(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setMessage('Password updated successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
    } catch (error: unknown) {
      setError(`Failed to update password: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    localStorage.setItem('userPreferences', JSON.stringify(updated))
    setMessage('Preferences updated!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No user found. Please sign in.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const roleConfig = getRoleConfig(user.role)

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your account details and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{user.full_name || 'Anonymous User'}</h3>
                <Badge variant={user.role === 'admin' ? 'default' : user.role === 'pro' ? 'secondary' : 'outline'}>
                  <Crown className="w-3 h-3 mr-1" />
                  {roleConfig.name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                {user.last_sign_in_at && (
                  <span>Last login {new Date(user.last_sign_in_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={user.full_name}
                onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <Button
            onClick={() => updateProfile({ full_name: user.full_name })}
            disabled={isSaving}
          >
            {isSaving ? 'Updating...' : 'Update Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Usage & Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Usage & Limits
          </CardTitle>
          <CardDescription>
            Track your current usage and plan limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Scans this month</span>
                <span>{usage.scansThisMonth} / {roleConfig.limits.scansPerMonth === -1 ? '∞' : roleConfig.limits.scansPerMonth}</span>
              </div>
              <Progress value={getUsagePercentage(user.role, 'scan', usage.scansThisMonth)} />
              <p className="text-xs text-muted-foreground">
                {getRemainingUsage(user.role, 'scan', usage.scansThisMonth) === 'unlimited'
                  ? 'Unlimited scans'
                  : `${getRemainingUsage(user.role, 'scan', usage.scansThisMonth)} remaining`
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>AI Requests</span>
                <span>{usage.aiRequestsThisMonth} / {roleConfig.limits.aiRequestsPerMonth === -1 ? '∞' : roleConfig.limits.aiRequestsPerMonth}</span>
              </div>
              <Progress value={getUsagePercentage(user.role, 'aiRequest', usage.aiRequestsThisMonth)} />
              <p className="text-xs text-muted-foreground">
                {getRemainingUsage(user.role, 'aiRequest', usage.aiRequestsThisMonth) === 'unlimited'
                  ? 'Unlimited requests'
                  : `${getRemainingUsage(user.role, 'aiRequest', usage.aiRequestsThisMonth)} remaining`
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Report Exports</span>
                <span>{usage.reportExportsThisMonth} / {roleConfig.limits.reportExports === -1 ? '∞' : roleConfig.limits.reportExports}</span>
              </div>
              <Progress value={getUsagePercentage(user.role, 'reportExport', usage.reportExportsThisMonth)} />
              <p className="text-xs text-muted-foreground">
                {getRemainingUsage(user.role, 'reportExport', usage.reportExportsThisMonth) === 'unlimited'
                  ? 'Unlimited exports'
                  : `${getRemainingUsage(user.role, 'reportExport', usage.reportExportsThisMonth)} remaining`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <Key className="w-4 h-4 mr-2" />
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </Button>
          </div>

          {showPasswordForm && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
              <Button onClick={updatePassword} disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Switch
              checked={preferences.twoFactorEnabled}
              onCheckedChange={(checked) => updatePreferences({ twoFactorEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Control what notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreferences({ emailNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Scan Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified when scans complete</p>
              </div>
              <Switch
                checked={preferences.scanNotifications}
                onCheckedChange={(checked) => updatePreferences({ scanNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-sm text-muted-foreground">Important security notifications</p>
              </div>
              <Switch
                checked={preferences.securityAlerts}
                onCheckedChange={(checked) => updatePreferences({ securityAlerts: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
