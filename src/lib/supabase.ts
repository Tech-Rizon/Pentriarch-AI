import { createClient } from '@supabase/supabase-js'

// Demo mode detection
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
                   process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://demo.supabase.co'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  plan: 'free' | 'pro' | 'enterprise'
  usage_tokens: number
  max_tokens: number
}

export interface Scan {
  id: string
  user_id: string
  target: string
  prompt: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  ai_model: string
  tool_used?: string
  command_executed?: string
  start_time: string
  end_time?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export interface Report {
  id: string
  scan_id: string
  findings: Finding[]
  summary: string
  risk_score: number
  generated_at: string
  ai_analysis?: string
  recommendations?: string[]
  export_url?: string
}

export interface Finding {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  cve_refs?: string[]
  cwe_refs?: string[]
  recommendation: string
  evidence?: string
  affected_urls?: string[]
}

export interface ScanLog {
  id: string
  scan_id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  raw_output?: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'scan_complete' | 'vulnerability_found' | 'system_alert' | 'ai_fallback'
  title: string
  message: string
  read: boolean
  created_at: string
  scan_id?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface UserSettings {
  id: string
  user_id: string
  preferred_ai_model: string
  notification_preferences: {
    email: boolean
    browser: boolean
    scan_complete: boolean
    vulnerabilities: boolean
  }
  api_keys: {
    openai?: string
    anthropic?: string
    deepseek?: string
  }
  branding: {
    company_name?: string
    logo_url?: string
    theme_color?: string
  }
  created_at: string
  updated_at: string
}

// Demo data for development
const createDemoUser = (): { id: string; email: string; name: string; created_at: string; role: string } => ({
  id: 'demo-user-123',
  email: 'demo@pentriarch.ai',
  name: 'Demo User',
  created_at: new Date().toISOString(),
  role: 'user'
})

const createDemoScans = (): Scan[] => [
  {
    id: 'scan-1',
    user_id: 'demo-user-123',
    target: 'example.com',
    prompt: 'Scan for common vulnerabilities',
    status: 'completed',
    ai_model: 'gpt-4',
    tool_used: 'nmap',
    command_executed: 'nmap -sV example.com',
    start_time: new Date(Date.now() - 300000).toISOString(),
    end_time: new Date(Date.now() - 240000).toISOString(),
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 240000).toISOString(),
    metadata: { risk_assessment: 'low' }
  },
  {
    id: 'scan-2',
    user_id: 'demo-user-123',
    target: 'testsite.com',
    prompt: 'Check for SQL injection vulnerabilities',
    status: 'running',
    ai_model: 'claude-3-sonnet',
    tool_used: 'sqlmap',
    command_executed: 'sqlmap -u testsite.com --batch',
    start_time: new Date(Date.now() - 120000).toISOString(),
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date(Date.now() - 60000).toISOString(),
    metadata: { risk_assessment: 'high' }
  }
]

// Auth helper functions
import { cookies } from 'next/headers'
import { type NextRequest } from 'next/server'

export const getCurrentUser = async (request?: NextRequest) => {
  if (isDemoMode) {
    return createDemoUser()
  }

  try {
    let accessToken = null
    // Try to get JWT from Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '')
      }
      // Fallback: Try to get from cookies
      if (!accessToken) {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const match = cookieHeader.match(/sb-access-token=([^;]+)/)
          if (match) accessToken = match[1]
        }
      }
    } else {
      // If no request, try next/headers cookies (for edge/server)
      const cookieStore = await cookies();
      accessToken = cookieStore.get('sb-access-token')?.value || null
    }

    if (!accessToken) {
      return null
    }

    // Create a Supabase client with the access token
    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    })
    const { data: { user } } = await supabaseServer.auth.getUser()
    return user
  } catch (error) {
    console.warn('Supabase auth error (server-side):', error)
    return null
  }
}

export const signOut = async () => {
  if (isDemoMode) {
    console.log('Demo mode: sign out simulated')
    return
  }

  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.warn('Supabase sign out error:', error)
  }
}

// Database helper functions
// Alias for insertScan to maintain compatibility
export const createScan = async (scan: Omit<Scan, 'id' | 'created_at' | 'updated_at'>) => {
  return insertScan(scan)
}

export const insertScan = async (scan: Omit<Scan, 'id' | 'created_at' | 'updated_at'>) => {
  if (isDemoMode) {
    const newScan: Scan = {
      ...scan,
      id: `demo-scan-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('Demo mode: scan created', newScan)
    return newScan
  }

  try {
    const { data, error } = await supabase
      .from('scans')
      .insert([scan])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase insert error, using demo data:', error)
    return {
      ...scan,
      id: `demo-scan-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}

export const updateScanStatus = async (scanId: string, status: Scan['status'], metadata?: Record<string, unknown>) => {
  if (isDemoMode) {
    const updatedScan = {
      id: scanId,
      status,
      updated_at: new Date().toISOString(),
      end_time: (status === 'completed' || status === 'failed') ? new Date().toISOString() : undefined,
      metadata
    }
    console.log('Demo mode: scan updated', updatedScan)
    return updatedScan
  }

  try {
    const updates: Partial<Scan> = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed' || status === 'failed') {
      updates.end_time = new Date().toISOString()
    }

    if (metadata) {
      updates.metadata = metadata
    }

    const { data, error } = await supabase
      .from('scans')
      .update(updates)
      .eq('id', scanId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase update error, using demo response:', error)
    return {
      id: scanId,
      status,
      updated_at: new Date().toISOString()
    }
  }
}

export const getScansForUser = async (userId: string) => {
  if (isDemoMode) {
    return createDemoScans()
  }

  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase query error, using demo data:', error)
    return createDemoScans()
  }
}

export const getScanById = async (scanId: string) => {
  if (isDemoMode) {
    const demoScans = createDemoScans()
    return demoScans.find(s => s.id === scanId) || demoScans[0]
  }

  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase query error, using demo data:', error)
    return createDemoScans()[0]
  }
}

export const insertReport = async (report: Omit<Report, 'id' | 'generated_at'>) => {
  if (isDemoMode) {
    const newReport = {
      ...report,
      id: `demo-report-${Date.now()}`,
      generated_at: new Date().toISOString()
    }
    console.log('Demo mode: report created', newReport)
    return newReport
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ ...report, generated_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase insert error, using demo response:', error)
    return {
      ...report,
      id: `demo-report-${Date.now()}`,
      generated_at: new Date().toISOString()
    }
  }
}

export const getReportByScanId = async (scanId: string) => {
  if (isDemoMode) {
    return {
      id: 'demo-report-1',
      scan_id: scanId,
      findings: [],
      summary: 'Demo scan completed successfully',
      risk_score: 3,
      generated_at: new Date().toISOString()
    }
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('scan_id', scanId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase query error, using demo data:', error)
    return {
      id: 'demo-report-1',
      scan_id: scanId,
      findings: [],
      summary: 'Demo scan completed successfully',
      risk_score: 3,
      generated_at: new Date().toISOString()
    }
  }
}

export const insertScanLog = async (log: Omit<ScanLog, 'id'>) => {
  if (isDemoMode) {
    const newLog = {
      ...log,
      id: `demo-log-${Date.now()}`
    }
    console.log('Demo mode: log created', newLog)
    return newLog
  }

  try {
    const { data, error } = await supabase
      .from('scan_logs')
      .insert([log])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase insert error, using demo response:', error)
    return {
      ...log,
      id: `demo-log-${Date.now()}`
    }
  }
}

export const getScanLogs = async (scanId: string) => {
  if (isDemoMode) {
    return [
      {
        id: 'demo-log-1',
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        message: 'Scan started',
        raw_output: 'Starting Nmap scan...'
      },
      {
        id: 'demo-log-2',
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        message: 'Scan completed',
        raw_output: 'Nmap scan completed successfully'
      }
    ]
  }

  try {
    const { data, error } = await supabase
      .from('scan_logs')
      .select('*')
      .eq('scan_id', scanId)
      .order('timestamp', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase query error, using demo data:', error)
    return [
      {
        id: 'demo-log-1',
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        message: 'Demo scan completed',
        raw_output: 'Demo output for development'
      }
    ]
  }
}

export const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
  if (isDemoMode) {
    const newNotification = {
      ...notification,
      id: `demo-notification-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    console.log('Demo mode: notification created', newNotification)
    return newNotification
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ ...notification, created_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase insert error, using demo response:', error)
    return {
      ...notification,
      id: `demo-notification-${Date.now()}`,
      created_at: new Date().toISOString()
    }
  }
}

export const getUserNotifications = async (userId: string) => {
  if (isDemoMode) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase query error, using demo data:', error)
    return []
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  if (isDemoMode) {
    console.log('Demo mode: notification marked as read', notificationId)
    return { id: notificationId, read: true }
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn('Supabase update error, using demo response:', error)
    return { id: notificationId, read: true }
  }
}

// Convenient wrapper for docker manager logging
export const logScanActivity = async (
  scanId: string,
  userId: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  message: string,
  rawOutput?: string
) => {
  return insertScanLog({
    scan_id: scanId,
    timestamp: new Date().toISOString(),
    level,
    message,
    raw_output: rawOutput
  })
}
