import { getScanByIdServer, getScanLogsServer, getReportByScanIdServer, insertReportServer } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/auth-helpers'
import { mcpRouter } from '@/lib/mcpRouter'

type ScanRecord = {
  id: string
  tool_used: string
  target: string
  command_executed: string
  start_time?: string
  end_time?: string
}

export const generateDetailedReportForScan = async (scanId: string) => {
  const existing = await getReportByScanIdServer(scanId)
  if (existing) return existing

  const scan = await getScanByIdServer(scanId)
  return generateDetailedReport(scan as ScanRecord)
}

export const generateDetailedReport = async (scan: ScanRecord & { metadata?: Record<string, unknown> }) => {
  try {
    const logs = await getScanLogsServer(scan.id)

    const toolUsed =
      scan.tool_used || (scan.metadata?.tool_suggested as string | undefined) || 'unknown'
    const commandExecuted =
      scan.command_executed || (scan.metadata?.command_generated as string | undefined) || ''

    const output = logs
      .filter(log => log.raw_output)
      .map(log => log.raw_output)
      .join('\n')

    if (!output) {
      throw new Error('No scan output available for analysis')
    }

    const durationMs =
      scan.start_time && scan.end_time
        ? new Date(scan.end_time).getTime() - new Date(scan.start_time).getTime()
        : 'Unknown'

    const analysisPrompt = `Analyze this penetration testing scan output and generate a detailed security report:

SCAN DETAILS:
- Tool: ${toolUsed}
- Target: ${scan.target}
- Command: ${commandExecuted}
- Duration: ${durationMs}ms

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
      'claude-3-sonnet',
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
      parsedReport = {
        summary: 'AI analysis completed. Raw output available in technical details.',
        risk_score: 5,
        findings: [],
        recommendations: ['Review scan output manually for detailed findings'],
        technical_details: {
          methodology: `Automated scan using ${toolUsed}`,
          tools_used: [toolUsed],
          scan_coverage: `Target: ${scan.target}`,
          limitations: 'Automated analysis only'
        }
      }
    }

    const report = await insertReportServer({
      scan_id: scan.id,
      findings: (parsedReport.findings as any[]) || [],
      summary: parsedReport.summary || 'Scan completed',
      risk_score: parsedReport.risk_score || 5,
      ai_analysis: reportResponse.response,
      recommendations: parsedReport.recommendations || []
    })

    return report
  } catch (error) {
    console.error('Report generation failed:', error)

    const basicReport = await insertReportServer({
      scan_id: scan.id,
      findings: [],
      summary: `${toolUsed} scan completed on ${scan.target}`,
      risk_score: 5,
      ai_analysis: `Analysis failed: ${getErrorMessage(error)}`,
      recommendations: ['Manual review of scan logs recommended']
    })

    return basicReport
  }
}
