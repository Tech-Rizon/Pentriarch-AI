import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer } from '@/lib/supabase'
import { dockerManager } from '@/lib/dockerManager'

// Mark as dynamic to skip build-time generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await dockerManager.healthCheck()

    return NextResponse.json({
      ok: status.docker && status.image,
      docker: status.docker,
      image: status.image,
      containers: status.containers
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      docker: false,
      image: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
