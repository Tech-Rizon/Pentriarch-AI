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

    // Get scan details
    const scan = await getScanById(scanId)

    // Verify scan belongs to user
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get scan logs
    const logs = await getScanLogs(scanId)

    return NextResponse.json({
      scan,
      logs,
      realtime: true
    })

  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
