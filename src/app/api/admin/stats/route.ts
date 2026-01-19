import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { dockerManager } from '@/lib/dockerManager'
import { requireAdmin, getErrorMessage } from '@/lib/auth-helpers'

type UserProfile = {
  id: string
  last_sign_in_at: string | null
  raw_user_meta_data?: { role?: string }
  created_at: string
}

type Scan = {
  status: 'running' | 'completed' | 'failed' | string
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Get user statistics
    const supabaseServer = getSupabaseServerClient()
    const { data: userStats } = await supabaseServer
      .from('profiles')
      .select(`
        id,
        last_sign_in_at,
        raw_user_meta_data,
        created_at
      `)

    const totalUsers = userStats?.length || 0
    const activeUsers = userStats?.filter((u: UserProfile) => {
      const lastSeen = new Date(u.last_sign_in_at || u.created_at)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return lastSeen > dayAgo
    }).length || 0

    // Get scan statistics
    const { data: scanStats } = await supabaseServer
      .from('scans')
      .select('status, created_at')

    const totalScans = scanStats?.length || 0
    const runningScans = scanStats?.filter((s: Scan) => s.status === 'running').length || 0
    const completedScans = scanStats?.filter((s: Scan) => s.status === 'completed').length || 0
    const failedScans = scanStats?.filter((s: Scan) => s.status === 'failed').length || 0

    // Get system resource usage (simulated for demo)
    const systemLoad = Math.floor(Math.random() * 30) + 20 // 20–50%
    const memoryUsage = Math.floor(Math.random() * 40) + 30 // 30–70%
    const diskUsage = Math.floor(Math.random() * 20) + 40 // 40–60%

    // Get container utilization
    const containerStatus = await dockerManager.getContainerStatus()
    const containerUtilization = containerStatus.running ?
      Math.floor(Math.random() * 50) + 25 : 0 // 25–75% if running

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalScans,
      runningScans,
      completedScans,
      failedScans,
      containerUtilization,
      systemLoad,
      memoryUsage,
      diskUsage
    })

  } catch (error) {
    const message = getErrorMessage(error)
    const status = message === 'Admin access required' ? 403 : 500
    if (status === 500) {
      console.error('Admin stats API error:', error)
    }
    return NextResponse.json({
      error: status === 403 ? 'Admin access required' : 'Failed to retrieve system statistics',
      details: message
    }, { status })
  }
}
