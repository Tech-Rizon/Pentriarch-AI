import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

const requireSupabaseConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
}

const requireSupabaseServiceConfig = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY.')
  }
}

export const getSupabaseServerClient = () => {
  requireSupabaseServiceConfig()
  return createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export const ensureUserProfileServer = async (user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } }) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { error } = await supabaseServer
      .from('user_profiles')
      .upsert([{
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || ''
      }], { onConflict: 'id' })

    if (error) throw error
  } catch (error) {
    console.error('Supabase user_profiles upsert error:', error)
    throw error
  }
}

const ensureUserProfileByIdServer = async (userId: string) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer.auth.admin.getUserById(userId)
    if (error) throw error
    if (!data?.user) {
      throw new Error(`Supabase auth user not found for ${userId}`)
    }
    await ensureUserProfileServer({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata as { full_name?: string | null } | undefined
    })
  } catch (error) {
    console.error('Supabase user_profiles lookup error:', error)
    throw error
  }
}

// Database Types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  plan: 'free' | 'pro' | 'enterprise'
  role?: 'user' | 'admin' | 'enterprise'
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

export interface Project {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export interface TargetScope {
  allowedPathPrefixes: string[]
  excludedPathPrefixes: string[]
  maxRequestsPerMinute: number
  maxConcurrency: number
}

export interface Target {
  id: string
  project_id: string
  base_url: string
  host: string
  verified: boolean
  active_scans_allowed: boolean
  scope: TargetScope | null
  created_at: string
}

export interface TargetVerification {
  id: string
  target_id: string
  method: 'well_known' | 'dns_txt' | 'loa'
  token: string
  status: 'pending' | 'verified' | 'failed' | 'expired'
  verified_at?: string | null
  created_at: string
  expires_at?: string | null
}

export interface ScanJob {
  id: string
  target_id: string
  scan_type: string
  status: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'
  started_at?: string | null
  ended_at?: string | null
  artifacts?: Record<string, unknown>
  created_by?: string | null
  created_at: string
}

export interface FindingRecord {
  id: string
  scan_job_id: string
  title: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  confidence: 'low' | 'medium' | 'high'
  category?: string | null
  description?: string | null
  recommendation?: string | null
  evidence_summary?: string | null
  created_at: string
}

export interface EvidenceRecord {
  id: string
  finding_id: string
  type: string
  data: Record<string, unknown>
  created_at: string
}

// Auth helper functions

// Server-side: only import in server components or API routes
// Usage: import { getCurrentUserServer } from '@/lib/supabase' in /app/api/* or server-only files
import { type NextRequest } from 'next/server'
export const getCurrentUserServer = async (request?: NextRequest) => {
  // Dynamic import to avoid static dependency in client bundle
  const { cookies } = await import('next/headers')
  requireSupabaseConfig()
  try {
    let accessToken = null
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '')
      }
      if (!accessToken) {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const match = cookieHeader.match(/sb-access-token=([^;]+)/)
          if (match) accessToken = match[1]
        }
      }
    } else {
  const cookieStore = await cookies();
  accessToken = cookieStore.get('sb-access-token')?.value || null
    }
    if (!accessToken) {
      return null
    }
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

// Client-side: use in React components and browser code
export const getCurrentUserClient = async () => {
  requireSupabaseConfig()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      const errorName = (error as { name?: string })?.name || ''
      const status = (error as { status?: number })?.status
      if (errorName === 'AuthSessionMissingError' || status === 400) {
        return null
      }
      throw error
    }
    return user
  } catch (error) {
    const errorName = (error as { name?: string })?.name || ''
    const status = (error as { status?: number })?.status
    if (errorName !== 'AuthSessionMissingError' && status !== 400) {
      console.warn('Supabase auth error (client-side):', error)
    }
    return null
  }
}

export const getAccessTokenClient = async () => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      const errorName = (error as { name?: string })?.name || ''
      const status = (error as { status?: number })?.status
      if (errorName === 'AuthSessionMissingError' || status === 400) {
        return null
      }
      throw error
    }
    return data.session?.access_token || null
  } catch (error) {
    const errorName = (error as { name?: string })?.name || ''
    const status = (error as { status?: number })?.status
    if (errorName !== 'AuthSessionMissingError' && status !== 400) {
      console.warn('Supabase session error (client-side):', error)
    }
    return null
  }
}

export const signOut = async () => {
  requireSupabaseConfig()
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
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('scans')
      .insert([scan])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const insertScanServer = async (scan: Omit<Scan, 'id' | 'created_at' | 'updated_at'>) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer
      .from('scans')
      .insert([scan])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === '23503') {
      await ensureUserProfileByIdServer(scan.user_id)
      const { data, error: retryError } = await supabaseServer
        .from('scans')
        .insert([scan])
        .select()
        .single()
      if (retryError) throw retryError
      return data
    }
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const updateScanStatus = async (scanId: string, status: Scan['status'], metadata?: Record<string, unknown>) => {
  requireSupabaseConfig()
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
    console.error('Supabase update error:', error)
    throw error
  }
}

export const updateScanStatusServer = async (
  scanId: string,
  status: Scan['status'],
  metadata?: Record<string, unknown>,
  extraUpdates?: Partial<Scan>
) => {
  const supabaseServer = getSupabaseServerClient()
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

    if (extraUpdates) {
      Object.assign(updates, extraUpdates)
    }

    const { data, error } = await supabaseServer
      .from('scans')
      .update(updates)
      .eq('id', scanId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === 'PGRST116') {
      console.warn('Supabase update warning: no rows updated for scan', scanId)
      return null
    }
    console.error('Supabase update error:', error)
    throw error
  }
}

export const getScansForUser = async (userId: string) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const getScanById = async (scanId: string) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const getScanByIdServer = async (scanId: string) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const insertReport = async (report: Omit<Report, 'id' | 'generated_at'>) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ ...report, generated_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const insertReportServer = async (report: Omit<Report, 'id' | 'generated_at'>) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer
      .from('reports')
      .insert([{ ...report, generated_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const getReportByScanId = async (scanId: string) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('scan_id', scanId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const getReportByScanIdServer = async (scanId: string) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer
      .from('reports')
      .select('*')
      .eq('scan_id', scanId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const insertScanLog = async (log: Omit<ScanLog, 'id'>) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('scan_logs')
      .insert([log])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const insertScanLogServer = async (log: Omit<ScanLog, 'id'>) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer
      .from('scan_logs')
      .insert([log])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const getScanLogs = async (scanId: string) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('scan_logs')
      .select('*')
      .eq('scan_id', scanId)
      .order('timestamp', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const getScanLogsServer = async (scanId: string) => {
  const supabaseServer = getSupabaseServerClient()
  try {
    const { data, error } = await supabaseServer
      .from('scan_logs')
      .select('*')
      .eq('scan_id', scanId)
      .order('timestamp', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ ...notification, created_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
}

export const getUserNotifications = async (userId: string) => {
  requireSupabaseConfig()
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase query error:', error)
    throw error
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  requireSupabaseConfig()
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
    console.error('Supabase update error:', error)
    throw error
  }
}

export const ensureDefaultProjectServer = async (userId: string) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!error && data) return data as Project

  const { data: created, error: insertError } = await supabaseServer
    .from('projects')
    .insert([{ owner_id: userId, name: 'Default Project' }])
    .select()
    .single()

  if (insertError) throw insertError
  return created as Project
}

export const getProjectByIdServer = async (projectId: string) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data as Project
}

export const listTargetsForOwnerServer = async (userId: string) => {
  const supabaseServer = getSupabaseServerClient()
  const { data: projects, error: projectError } = await supabaseServer
    .from('projects')
    .select('id')
    .eq('owner_id', userId)

  if (projectError) throw projectError
  const projectIds = (projects || []).map((project) => project.id)
  if (projectIds.length === 0) return []

  const { data, error } = await supabaseServer
    .from('targets')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Target[]
}

export const createTargetServer = async (projectId: string, target: Omit<Target, 'id' | 'created_at' | 'project_id'>) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('targets')
    .insert([{ ...target, project_id: projectId }])
    .select()
    .single()

  if (error) throw error
  return data as Target
}

export const getTargetByIdServer = async (targetId: string) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('targets')
    .select('*')
    .eq('id', targetId)
    .single()

  if (error) throw error
  return data as Target
}

export const createTargetVerificationServer = async (verification: Omit<TargetVerification, 'id' | 'created_at' | 'status'> & { status?: TargetVerification['status'] }) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('target_verifications')
    .insert([{
      ...verification,
      status: verification.status || 'pending'
    }])
    .select()
    .single()

  if (error) throw error
  return data as TargetVerification
}

export const getLatestPendingVerificationServer = async (targetId: string) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('target_verifications')
    .select('*')
    .eq('target_id', targetId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data as TargetVerification
}

export const updateTargetVerificationStatusServer = async (verificationId: string, status: TargetVerification['status'], verifiedAt?: string) => {
  const supabaseServer = getSupabaseServerClient()
  const updates: Partial<TargetVerification> = { status }
  if (verifiedAt) {
    updates.verified_at = verifiedAt
  }

  const { data, error } = await supabaseServer
    .from('target_verifications')
    .update(updates)
    .eq('id', verificationId)
    .select()
    .single()

  if (error) throw error
  return data as TargetVerification
}

export const markTargetVerifiedServer = async (targetId: string) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('targets')
    .update({ verified: true, active_scans_allowed: true })
    .eq('id', targetId)
    .select()
    .single()

  if (error) throw error
  return data as Target
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
