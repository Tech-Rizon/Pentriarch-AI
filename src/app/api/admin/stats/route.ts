import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { dockerManager } from '@/lib/dockerManager'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.raw_user_meta_data?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get user statistics
    const { data: userStats } = await supabase
      .from('profiles')
      .select(`
        id,
        last_sign_in_at,
        raw_user_meta_data,
        created_at
      `)

    const totalUsers = userStats?.length || 0
    const activeUsers = userStats?.filter(u => {
      const lastSeen = new Date(u.last_sign_in_at || u.created_at)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return lastSeen > dayAgo
    }).length || 0

    // Get scan statistics
    const { data: scanStats } = await supabase
      .from('scans')
      .select('status, created_at')

    const totalScans = scanStats?.length || 0
    const runningScans = scanStats?.filter(s => s.status === 'running').length || 0
    const completedScans = scanStats?.filter(s => s.status === 'completed').length || 0
    const failedScans = scanStats?.filter(s => s.status === 'failed').length || 0

    // Get system resource usage (simulated for demo)
    const systemLoad = Math.floor(Math.random() * 30) + 20 // 20-50%
    const memoryUsage = Math.floor(Math.random() * 40) + 30 // 30-70%
    const diskUsage = Math.floor(Math.random() * 20) + 40 // 40-60%

    // Get container utilization
    const containerStatus = await dockerManager.getContainerStatus()
    const containerUtilization = containerStatus.running ?
      Math.floor(Math.random() * 50) + 25 : 0 // 25-75% if running

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
    console.error('Admin stats API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve system statistics',
      details: error.message
    }, { status: 500 })
  }
}
