import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer, getScanByIdServer } from '@/lib/supabase'
import { dockerManager } from '@/lib/dockerManager'

export async function GET(request: NextRequest) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    // Get container status from live manager
    const status = await dockerManager.getContainerStatus(scanId || undefined)
    if (status.exists || !scanId) {
      return NextResponse.json(status)
    }

    // Fallback to last-known container metadata stored on the scan
    const scan = await getScanByIdServer(scanId)
    const containerMeta = scan?.metadata && typeof scan.metadata === 'object'
      ? (scan.metadata as { container?: Record<string, unknown> }).container
      : undefined

    if (containerMeta && typeof containerMeta === 'object') {
      return NextResponse.json({
        exists: true,
        running: false,
        stats: {
          memory_usage: "N/A",
          cpu_usage: "N/A",
          uptime: "N/A",
          container_id: String(containerMeta.id || ''),
          image: String(containerMeta.image || ''),
          created: String(containerMeta.started_at || containerMeta.ended_at || '')
        },
        last_known: containerMeta
      })
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('Container status API error:', error)
    return NextResponse.json({
      error: 'Failed to get container status',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
