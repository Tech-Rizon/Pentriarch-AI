import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getReportByScanId, getScanById } from '@/lib/supabase'

interface ReportFinding {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: string
  recommendation: string
  affected_components: string[]
}

interface ReportData {
  scan: {
    id: string
    target: string
    tool_used: string
    start_time: string
    end_time: string
    ai_model: string
    status: string
  }
  report: {
    id: string
    findings: ReportFinding[]
    generated_at: string
    summary: string
    recommendations: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scanId, format = 'pdf', includeRawOutput = false } = await request.json()

    if (!scanId) {
      return NextResponse.json({
        error: 'Scan ID is required'
      }, { status: 400 })
    }

    // Validate format
    if (!['pdf', 'json', 'xml', 'csv'].includes(format)) {
      return NextResponse.json({
        error: 'Invalid format. Supported: pdf, json, xml, csv'
      }, { status: 400 })
    }

    // Get scan and verify ownership
    const scan = await getScanById(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get report
    const report = await getReportByScanId(scanId)
    if (!report) {
      return NextResponse.json({
        error: 'Report not found. Generate report first.'
      }, { status: 404 })
    }

    // Get scan logs if raw output requested
    let scanLogs = []
    if (includeRawOutput) {
      const { getScanLogs } = await import('@/lib/supabase')
      scanLogs = await getScanLogs(scanId)
    }

    const exportData: ReportData = {
      scan: {
        id: scan.id,
        target: scan.target,
        tool_used: scan.tool_used,
        start_time: scan.start_time,
        end_time: scan.end_time,
        status: scan.status,
        ai_model: scan.ai_model
      },
      report: {
        id: report.id,
        summary: report.summary,
        risk_score: report.risk_score,
        findings: report.findings,
        recommendations: report.recommendations,
        generated_at: report.generated_at
      },
      ...(includeRawOutput && { logs: scanLogs }),
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.email,
        format,
        platform: 'Pentriarch AI'
      }
    }

    switch (format) {
      case 'json':
        return NextResponse.json(exportData, {
          headers: {
            'Content-Disposition': `attachment; filename="pentriarch-report-${scanId}.json"`,
            'Content-Type': 'application/json'
          }
        })

      case 'xml': {
        const xmlContent = generateXMLReport(exportData)
        return new NextResponse(xmlContent, {
          headers: {
            'Content-Disposition': `attachment; filename="pentriarch-report-${scanId}.xml"`,
            'Content-Type': 'application/xml'
          }
        })
      }

      case 'csv': {
        const csvContent = generateCSVReport(exportData)
        return new NextResponse(csvContent, {
          headers: {
            'Content-Disposition': `attachment; filename="pentriarch-report-${scanId}.csv"`,
            'Content-Type': 'text/csv'
          }
        })
      }

      case 'pdf': {
        const pdfBuffer = await generatePDFReport(exportData)
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Disposition': `attachment; filename="pentriarch-report-${scanId}.pdf"`,
            'Content-Type': 'application/pdf'
          }
        })
      }

      default:
        return NextResponse.json({
          error: 'Unsupported format'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Export report error:', error)
    return NextResponse.json({
      error: 'Failed to export report',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// XML Report Generation
function generateXMLReport(data: ReportData): string {
  const escapeXml = (str: string) =>
    str?.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c)) || ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<PentestReport>
  <Scan>
    <ID>${data.scan.id}</ID>
    <Target>${escapeXml(data.scan.target)}</Target>
    <Tool>${escapeXml(data.scan.tool_used || '')}</Tool>
    <StartTime>${data.scan.start_time}</StartTime>
    <EndTime>${data.scan.end_time || ''}</EndTime>
    <Status>${escapeXml(data.scan.status)}</Status>
    <AIModel>${escapeXml(data.scan.ai_model || '')}</AIModel>
  </Scan>
  <Report>
    <ID>${data.report.id}</ID>
    <GeneratedAt>${data.report.generated_at}</GeneratedAt>
    <Findings>
      ${data.report.findings.map((finding: ReportFinding) => `
      <Finding>
        <Title>${escapeXml(finding.title || '')}</Title>
        <Description>${escapeXml(finding.description || '')}</Description>
        <Severity>${escapeXml(finding.severity || 'medium')}</Severity>
        <Impact>${escapeXml(finding.impact || '')}</Impact>
        <Recommendation>${escapeXml(finding.recommendation || '')}</Recommendation>
        <AffectedComponents>
          ${finding.affected_components?.map(comp => `<Component>${escapeXml(comp)}</Component>`).join('') || ''}
        </AffectedComponents>
      </Finding>
      `).join('')}
    </Findings>
    <Summary>${escapeXml(data.report.summary || '')}</Summary>
  </Report>
</PentestReport>`
}

// CSV Report Generation
function generateCSVReport(data: ReportData): string {
  const escapeCSV = (str: string) =>
    `"${str?.replace(/"/g, '""') || ''}"`

  let csv = 'Section,Field,Value\n'

  // Scan information
  csv += `Scan,ID,${escapeCSV(data.scan.id)}\n`
  csv += `Scan,Target,${escapeCSV(data.scan.target)}\n`
  csv += `Scan,Tool,${escapeCSV(data.scan.tool_used || '')}\n`
  csv += `Scan,Start Time,${escapeCSV(data.scan.start_time)}\n`
  csv += `Scan,End Time,${escapeCSV(data.scan.end_time || '')}\n`
  csv += `Scan,Status,${escapeCSV(data.scan.status)}\n`
  csv += `Scan,AI Model,${escapeCSV(data.scan.ai_model || '')}\n`

  // Findings
  data.report.findings.forEach((finding: ReportFinding, index: number) => {
    csv += `Finding ${index + 1},Title,${escapeCSV(finding.title || '')}\n`
    csv += `Finding ${index + 1},Description,${escapeCSV(finding.description || '')}\n`
    csv += `Finding ${index + 1},Severity,${escapeCSV(finding.severity || 'medium')}\n`
    csv += `Finding ${index + 1},Impact,${escapeCSV(finding.impact || '')}\n`
    csv += `Finding ${index + 1},Recommendation,${escapeCSV(finding.recommendation || '')}\n`
    csv += `Finding ${index + 1},Affected Components,${escapeCSV(finding.affected_components?.join(', ') || '')}\n`
  })

  return csv
}

// PDF Report Generation (simplified - in production use puppeteer or similar)
async function generatePDFReport(data: ReportData): Promise<Buffer> {
  // For now, return a simple text-based PDF placeholder
  // In production, implement with puppeteer, jsPDF, or similar

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Penetration Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; }
        .finding { margin: 20px 0; padding: 15px; border-left: 4px solid #007cba; }
        .finding.high { border-left-color: #d32f2f; }
        .finding.critical { border-left-color: #b71c1c; }
        .finding.medium { border-left-color: #f57c00; }
        .finding.low { border-left-color: #388e3c; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Penetration Test Report</h1>
        <p>Generated: ${data.report.generated_at}</p>
      </div>

      <h2>Scan Information</h2>
      <table>
        <tr><td>Target</td><td>${data.scan.target}</td></tr>
        <tr><td>Tool Used</td><td>${data.scan.tool_used || 'N/A'}</td></tr>
        <tr><td>Scan Duration</td><td>${data.scan.end_time ?
          `${Math.round((new Date(data.scan.end_time).getTime() - new Date(data.scan.start_time).getTime()) / 1000)}s`
          : 'N/A'}</td></tr>
        <tr><td>AI Model</td><td>${data.scan.ai_model || 'N/A'}</td></tr>
        <tr><td>Status</td><td>${data.scan.status}</td></tr>
      </table>

    <h2>Security Findings</h2>
    ${data.report.findings.length === 0 ? '<p>No security findings detected.</p>' :
      data.report.findings.map((finding: ReportFinding) => `
        <div class="finding ${finding.severity || 'medium'}">
          <h3>${finding.title || 'Security Finding'}</h3>
          <p><strong>Severity:</strong> ${finding.severity || 'Medium'}</p>
          <p><strong>Description:</strong> ${finding.description || 'No description available'}</p>
          <p><strong>Impact:</strong> ${finding.impact || 'Impact assessment pending'}</p>
          <p><strong>Recommendation:</strong> ${finding.recommendation || 'Recommendations pending'}</p>
          ${finding.affected_components?.length ?
            `<p><strong>Affected Components:</strong> ${finding.affected_components.join(', ')}</p>` : ''}
        </div>
      `).join('')
    }
    </body>
    </html>
  `

  // For demo purposes, return HTML as buffer
  // In production, use a proper PDF generation library
  return Buffer.from(htmlContent, 'utf-8')
}
