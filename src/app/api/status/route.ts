import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dockerManager } from '@/lib/dockerManager'

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY)) {
    throw new Error('Supabase service credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY.')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  )
}

// Define notification type
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    const supabase = getSupabaseClient()

    // Get active scans
    let query = supabase
      .from('scans')
      .select('id, status, progress, current_step, latest_output, target, tool_used, created_at, updated_at')
      .in('status', ['starting', 'running'])
      .order('created_at', { ascending: false })
      .limit(10)

    // Filter by user if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: activeScans, error: scansError } = await query

    if (scansError) {
      console.error('Error fetching active scans:', scansError)
    }

    // Get container status for active scans
    const containerStatuses = []
    if (activeScans && activeScans.length > 0) {
      for (const scan of activeScans) {
        try {
          const status = await dockerManager.getContainerStatus(scan.id)
          containerStatuses.push({
            scanId: scan.id,
            ...status
          })
        } catch (error) {
          console.debug('Could not fetch container status for scan', scan.id, error)
        }
      }
    }

    // Get recent notifications for the user
    let notifications: Notification[] = []
    if (userId) {
      const { data: notificationData } = await supabase
        .from('notifications')
        .select('id, type, title, message, priority, created_at')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5)

      notifications = notificationData || []
    }

    // Get system status
    const systemStatus = {
      healthy: true,
      timestamp: new Date().toISOString(),
      activeScansCount: activeScans?.length || 0,
      containerCount: containerStatuses.length
    }

    return Response.json({
      success: true,
      data: {
        activeScans: activeScans || [],
        containerStatuses,
        notifications,
        systemStatus
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Status API error:', error)
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST endpoint for updating scan status (for internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scanId, status, progress, currentStep, output } = body

    if (!scanId) {
      return Response.json(
        { error: 'Scan ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Update scan status in database
    const updateData: {
      updated_at: string
      status?: string
      progress?: number
      current_step?: string
      latest_output?: string
    } = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (currentStep) updateData.current_step = currentStep
    if (output) updateData.latest_output = output

    const { data, error } = await supabase
      .from('scans')
      .update(updateData)
      .eq('id', scanId)
      .select()
      .single()

    if (error) {
      console.error('Error updating scan status:', error)
      return Response.json(
        { error: 'Failed to update scan status' },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Status update error:', error)
    return Response.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
