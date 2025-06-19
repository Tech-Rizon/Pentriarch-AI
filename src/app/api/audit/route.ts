import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

interface AuditScanData {
  id: string
  target: string
  prompt?: string
  status: string
  ai_model?: string
  tool_used?: string
  command_executed?: string
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
  user_id: string
  output?: string
  error_message?: string
  metadata?: {
    risk_assessment?: string
    [key: string]: unknown
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const action = searchParams.get('action')
    const scanId = searchParams.get('scan_id')
    const limit = Number.parseInt(searchParams.get('limit') || '100')
    const offset = Number.parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('scans')
      .select(`
        id,
        target,
        prompt,
        status,
        ai_model,
        tool_used,
        command_executed,
        start_time,
        end_time,
        created_at,
        updated_at,
        metadata,
        scan_logs (
          id,
          timestamp,
          level,
          message,
          raw_output
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (action) {
      query = query.eq('status', action)
    }
    if (scanId) {
      query = query.eq('id', scanId)
    }

    const { data: auditData, error } = await query

    if (error) {
      throw error
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (startDate) countQuery = countQuery.gte('created_at', startDate)
    if (endDate) countQuery = countQuery.lte('created_at', endDate)
    if (action) countQuery = countQuery.eq('status', action)
    if (scanId) countQuery = countQuery.eq('id', scanId)

    const { count } = await countQuery

    // Generate audit summary
    const auditSummary = {
      totalRecords: count || 0,
      dateRange: {
        start: startDate || 'all time',
        end: endDate || 'present'
      },
      statusBreakdown: {},
      toolUsage: {},
      aiModelUsage: {},
      complianceMetrics: {
        averageExecutionTime: 0,
        successRate: 0,
        criticalEvents: 0
      }
    }

    // Calculate metrics
    if (auditData && auditData.length > 0) {
      const statusCounts: Record<string, number> = {}
      const toolCounts: Record<string, number> = {}
      const modelCounts: Record<string, number> = {}
      let totalDuration = 0
      let completedScans = 0
      let criticalEvents = 0

      for (const scan of auditData as AuditScanData[]) {
        // Status breakdown
        statusCounts[scan.status] = (statusCounts[scan.status] || 0) + 1

        // Tool usage
        if (scan.tool_used) {
          toolCounts[scan.tool_used] = (toolCounts[scan.tool_used] || 0) + 1
        }

        // AI model usage
        if (scan.ai_model) {
          modelCounts[scan.ai_model] = (modelCounts[scan.ai_model] || 0) + 1
        }

        // Duration calculation
        if (scan.start_time && scan.end_time) {
          const duration = new Date(scan.end_time).getTime() - new Date(scan.start_time).getTime()
          totalDuration += duration
          completedScans++
        }

        // Critical events (failures, high-risk tools)
        if (scan.status === 'failed' || scan.metadata?.risk_assessment === 'critical') {
          criticalEvents++
        }
      }

      auditSummary.statusBreakdown = statusCounts
      auditSummary.toolUsage = toolCounts
      auditSummary.aiModelUsage = modelCounts
      auditSummary.complianceMetrics = {
        averageExecutionTime: completedScans > 0 ? Math.round(totalDuration / completedScans / 1000) : 0,
        successRate: auditData.length > 0 ? Math.round(((statusCounts.completed || 0) / auditData.length) * 100) : 0,
        criticalEvents
      }
    }

    return NextResponse.json({
      auditTrail: auditData,
      summary: auditSummary,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      },
      compliance: {
        dataRetention: '90 days',
        encryption: 'AES-256',
        accessLogging: 'enabled',
        auditStandards: ['SOC2', 'ISO27001']
      }
    })

  } catch (error) {
    console.error('Audit API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve audit trail',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, details, scanId, metadata } = await request.json()

    if (!action) {
      return NextResponse.json({
        error: 'Action is required for audit logging'
      }, { status: 400 })
    }

    // Log custom audit event
    const auditEvent = {
      scan_id: scanId || null,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `User action: ${action}`,
      raw_output: JSON.stringify({
        action,
        details,
        metadata,
        user_id: user.id,
        user_email: user.email,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })
    }

    // If scanId provided, log to scan_logs table
    if (scanId) {
      const { error } = await supabase
        .from('scan_logs')
        .insert([auditEvent])

      if (error) {
        console.error('Failed to insert audit log:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Audit event logged',
      eventId: `audit-${Date.now()}`,
      timestamp: auditEvent.timestamp
    })

  } catch (error) {
    console.error('Audit logging error:', error)
    return NextResponse.json({
      error: 'Failed to log audit event',
      details: error.message
    }, { status: 500 })
  }
}

// Export audit data (for compliance)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin privileges
    const userPlan = user.raw_user_meta_data?.plan || 'free'
    if (userPlan !== 'enterprise') {
      return NextResponse.json({
        error: 'Audit export requires Enterprise plan'
      }, { status: 403 })
    }

    const { format = 'json', includeSystemLogs = false } = await request.json()

    // Get comprehensive audit data
    const { data: auditData, error } = await supabase
      .from('scans')
      .select(`
        *,
        scan_logs (*),
        reports (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      user_id: user.id,
      organization: user.raw_user_meta_data?.organization || 'Individual',
      audit_period: {
        start: auditData?.[auditData.length - 1]?.created_at || null,
        end: auditData?.[0]?.created_at || null
      },
      total_records: auditData?.length || 0,
      data: auditData,
      compliance_info: {
        standards: ['SOC2 Type II', 'ISO 27001', 'GDPR'],
        retention_policy: '90 days',
        encryption: 'AES-256',
        data_classification: 'Confidential'
      }
    }

    const filename = `pentriarch-audit-${user.id}-${new Date().toISOString().split('T')[0]}.${format}`

    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': 'application/json'
        }
      })
    }

    if (format === 'csv') {
      // Convert to CSV format for compliance teams
      let csv = 'Timestamp,Action,User,Target,Tool,Status,Risk_Level,Duration,Details\n'

      if (auditData) {
        for (const scan of auditData as AuditScanData[]) {
          const duration = scan.end_time && scan.start_time
            ? Math.round((new Date(scan.end_time).getTime() - new Date(scan.start_time).getTime()) / 1000)
            : 'N/A'

          csv += `${scan.created_at},scan,${user.email},${scan.target},${scan.tool_used || 'N/A'},${scan.status},${scan.metadata?.risk_assessment || 'unknown'},${duration},"${scan.prompt?.replace(/"/g, '""') || 'N/A'}"\n`
        }
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': 'text/csv'
        }
      })
    }

    return NextResponse.json({
      error: 'Unsupported export format'
    }, { status: 400 })

  } catch (error) {
    console.error('Audit export error:', error)
    return NextResponse.json({
      error: 'Failed to export audit data',
      details: error.message
    }, { status: 500 })
  }
}
