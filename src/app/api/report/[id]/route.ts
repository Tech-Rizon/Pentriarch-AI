import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer, getScanByIdServer, getReportByScanIdServer } from '@/lib/supabase'
import { generateDetailedReport } from '@/lib/reporting'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: scanId } = await params

    // Get scan and verify ownership
    const scan = await getScanByIdServer(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get existing report or generate new one
    let report = await getReportByScanIdServer(scanId)

    if (!report && scan.status === 'completed') {
      report = await generateDetailedReport(scan)
    }

    return NextResponse.json({
      scan,
      report,
      hasReport: !!report
    })

  } catch (error) {
    console.error('Report API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: scanId } = await params
    const { regenerate = false } = await request.json()

    // Get scan and verify ownership
    const scan = await getScanByIdServer(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (scan.status !== 'completed') {
      return NextResponse.json({
        error: 'Cannot generate report for incomplete scan'
      }, { status: 400 })
    }

    // Check if report exists and regenerate if requested
    let report = await getReportByScanIdServer(scanId)

    if (!report || regenerate) {
      report = await generateDetailedReport(scan)
    }

    return NextResponse.json({
      success: true,
      report,
      regenerated: regenerate && !!report
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

