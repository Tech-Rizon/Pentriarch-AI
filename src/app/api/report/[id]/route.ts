import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getScanById, getReportByScanId, insertReport } from '@/lib/supabase'
import { mcpRouter } from '@/lib/mcpRouter'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scanId = params.id

    // Get scan and verify ownership
    const scan = await getScanById(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get existing report or generate new one
    let report = await getReportByScanId(scanId)

    if (!report && scan.status === 'completed') {
      // Generate report using AI
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
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scanId = params.id
    const { regenerate = false } = await request.json()

    // Get scan and verify ownership
    const scan = await getScanById(scanId)
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (scan.status !== 'completed') {
      return NextResponse.json({
        error: 'Cannot generate report for incomplete scan'
      }, { status: 400 })
    }

    // Check if report exists and regenerate if requested
    let report = await getReportByScanId(scanId)

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
      details: error.message
    }, { status: 500 })
  }
}

// AI-powered report generation
async function generateDetailedReport(scan: {
  id: string
  tool_used: string
  target: string
  command_executed: string
}) {
  try {
    // Get scan logs for analysis
    const { getScanLogs } = await import('@/lib/supabase')
    const logs = await getScanLogs(scan.id)

    const output = logs
      .filter(log => log.raw_output)
      .map(log => log.raw_output)
      .join('\n')

    if (!output) {
      throw new Error('No scan output available for analysis')
    }

    // AI analysis prompt
    const analysisPrompt = `Analyze this penetration testing scan output and generate a detailed security report:

SCAN DETAILS:
- Tool: ${scan.tool_used}
- Target: ${scan.target}
- Command: ${scan.command_executed}
- Duration: ${scan.end_time ? new Date(scan.end_time).getTime() - new Date(scan.start_time).getTime() : 'Unknown'}ms

SCAN OUTPUT:
${output}

Generate a comprehensive JSON report with this structure:
{
  "summary": "Executive summary of findings",
  "risk_score": 1-10,
  "findings": [
    {
      "title": "Finding title",
      "description": "Detailed description",
      "severity": "low|medium|high|critical",
      "cve_refs": ["CVE-2023-1234"],
      "cwe_refs": ["CWE-89"],
      "recommendation": "How to fix",
      "evidence": "Specific evidence from output",
      "affected_urls": ["url1", "url2"]
    }
  ],
  "recommendations": [
    "Prioritized recommendations for remediation"
  ],
  "technical_details": {
    "methodology": "How the scan was performed",
    "tools_used": ["tool1", "tool2"],
    "scan_coverage": "What was tested",
    "limitations": "What wasn't tested or limitations"
  }
}`

    const reportResponse = await mcpRouter.executePrompt(
      analysisPrompt,
      'claude-3-sonnet', // Use Claude for detailed analysis
      'You are a professional cybersecurity analyst generating detailed penetration testing reports. Focus on accuracy, actionable recommendations, and clear risk assessment.'
    )

    let parsedReport: {
      summary: string
      risk_score: number
      findings: unknown[]
      recommendations: string[]
      technical_details: {
        methodology: string
        tools_used: string[]
        scan_coverage: string
        limitations: string
      }
    }
    try {
      parsedReport = JSON.parse(reportResponse.response)
    } catch {
      // Fallback if AI doesn't return valid JSON
      parsedReport = {
        summary: 'AI analysis completed. Raw output available in technical details.',
        risk_score: 5,
        findings: [],
        recommendations: ['Review scan output manually for detailed findings'],
        technical_details: {
          methodology: `Automated scan using ${scan.tool_used}`,
          tools_used: [scan.tool_used],
          scan_coverage: `Target: ${scan.target}`,
          limitations: 'Automated analysis only'
        }
      }
    }

    // Insert report into database
    const report = await insertReport({
      scan_id: scan.id,
      findings: parsedReport.findings || [],
      summary: parsedReport.summary || 'Scan completed',
      risk_score: parsedReport.risk_score || 5,
      ai_analysis: reportResponse.response,
      recommendations: parsedReport.recommendations || []
    })

    return report

  } catch (error) {
    console.error('Report generation failed:', error)

    // Fallback basic report
    const basicReport = await insertReport({
      scan_id: scan.id,
      findings: [],
      summary: `${scan.tool_used} scan completed on ${scan.target}`,
      risk_score: 5,
      ai_analysis: `Analysis failed: ${error.message}`,
      recommendations: ['Manual review of scan logs recommended']
    })

    return basicReport
  }
}
