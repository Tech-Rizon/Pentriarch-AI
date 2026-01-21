import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer, updateScanStatusServer } from '@/lib/supabase'
import { dockerManager } from '@/lib/dockerManager'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scanId } = await request.json()

    if (!scanId) {
      return NextResponse.json({
        error: 'Scan ID is required'
      }, { status: 400 })
    }

    // Verify scan ownership
    const { getScanByIdServer } = await import('@/lib/supabase')
    const scan = await getScanByIdServer(scanId)
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Kill the container
    const killed = await dockerManager.killScan(scanId)

    if (killed) {
      // Update scan status to cancelled
      await updateScanStatusServer(scanId, 'cancelled', {
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        reason: 'Manual termination via Container Manager'
      })

      return NextResponse.json({
        success: true,
        message: 'Container terminated successfully',
        scanId
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Container not found or already stopped',
      scanId
    })

  } catch (error) {
    console.error('Kill container API error:', error)
    return NextResponse.json({
      error: 'Failed to kill container',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
