import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getScanById, getScanLogs } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
<<<<<<< HEAD
  { params }: { params: { id: string } }
=======
  { params }: { params: Promise<{ id: string }> }
>>>>>>> 640bda3 (Update v1.7.0)
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

<<<<<<< HEAD
    const scanId = params.id
=======
    const { id: scanId } = await params
>>>>>>> 640bda3 (Update v1.7.0)
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') // Filter by log level
    const limit = Number.parseInt(searchParams.get('limit') || '100')
    const offset = Number.parseInt(searchParams.get('offset') || '0')

    // Get scan and verify ownership
    const scan = await getScanById(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get scan logs
    let logs = await getScanLogs(scanId)

    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level)
    }

    // Apply pagination
    const totalLogs = logs.length
    const paginatedLogs = logs.slice(offset, offset + limit)

    // Format logs for frontend
    const formattedLogs = paginatedLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      raw_output: log.raw_output
    }))

    return NextResponse.json({
      logs: formattedLogs,
      total: totalLogs,
      offset,
      limit,
      hasMore: offset + limit < totalLogs,
      scan: {
        id: scan.id,
        status: scan.status,
        start_time: scan.start_time,
        end_time: scan.end_time
      }
    })

  } catch (error) {
    console.error('Scan logs API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve scan logs',
<<<<<<< HEAD
      details: error.message
=======
      details: error instanceof Error ? error.message : "Unknown error"
>>>>>>> 640bda3 (Update v1.7.0)
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
<<<<<<< HEAD
  { params }: { params: { id: string } }
=======
  { params }: { params: Promise<{ id: string }> }
>>>>>>> 640bda3 (Update v1.7.0)
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

<<<<<<< HEAD
    const scanId = params.id
=======
    const { id: scanId } = await params
>>>>>>> 640bda3 (Update v1.7.0)

    // Get scan and verify ownership
    const scan = await getScanById(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete logs (only for completed or failed scans)
    if (!['completed', 'failed', 'cancelled'].includes(scan.status)) {
      return NextResponse.json({
        error: 'Cannot delete logs for active scans'
      }, { status: 400 })
    }

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase
      .from('scan_logs')
      .delete()
      .eq('scan_id', scanId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Scan logs deleted successfully',
      scanId
    })

  } catch (error) {
    console.error('Delete scan logs API error:', error)
    return NextResponse.json({
      error: 'Failed to delete scan logs',
<<<<<<< HEAD
      details: error.message
=======
      details: error instanceof Error ? error.message : "Unknown error"
>>>>>>> 640bda3 (Update v1.7.0)
    }, { status: 500 })
  }
}
