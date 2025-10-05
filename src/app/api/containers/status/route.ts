import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer } from '@/lib/supabase'
import { dockerManager } from '@/lib/dockerManager'

export async function GET(request: NextRequest) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    // Get container status
    const status = await dockerManager.getContainerStatus(scanId || undefined)

    return NextResponse.json(status)

  } catch (error) {
    console.error('Container status API error:', error)
    return NextResponse.json({
      error: 'Failed to get container status',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
