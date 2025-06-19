'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Shield,
  Eye,
  Calendar,
  Activity,
  BarChart3,
  ExternalLink
} from 'lucide-react'
import { getCurrentUser } from '@/lib/supabase'

interface Finding {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  cve_refs?: string[]
  cwe_refs?: string[]
  recommendation: string
  evidence?: string
  affected_urls?: string[]
}

interface Report {
  id: string
  scan_id: string
  findings: Finding[]
  summary: string
  risk_score: number
  generated_at: string
  ai_analysis?: string
  recommendations?: string[]
}

interface Scan {
  id: string
  target: string
  tool_used: string
  start_time: string
  end_time?: string
  status: string
  ai_model: string
  prompt: string
}

interface ReportDetailProps {
  scanId: string
  onClose?: () => void
}

export default function ReportDetail({ scanId, onClose }: ReportDetailProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [scan, setScan] = useState<Scan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
    loadReport()
  }, [scanId])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const loadReport = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/report/${scanId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load report')
      }

      setReport(data.report)
      setScan(data.scan)
    } catch (error) {
      console.error('Failed to load report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setIsGenerating(true)
      const response = await fetch(`/api/report/${scanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }

      setReport(data.report)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReport = async (format: string) => {
    try {
      setIsExporting(true)
      const response = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId,
          format,
          includeRawOutput: true
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `pentriarch-report-${scanId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-400" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      default:
        return <Shield className="h-4 w-4 text-slate-400" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return variants[severity as keyof typeof variants] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 8) return 'text-red-400'
    if (score >= 6) return 'text-orange-400'
    if (score >= 4) return 'text-yellow-400'
    return 'text-green-400'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Security Report</h1>
              <p className="text-slate-400">
                {scan?.target} • {scan?.tool_used} • {scan ? new Date(scan.generated_at || scan.start_time).toLocaleDateString() : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
                ← Back to Dashboard
              </Button>
            )}
            <Button
              variant="outline"
              onClick={generateReport}
              disabled={isGenerating}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </Button>
          </div>
        </div>

        {!report ? (
          /* No Report Available */
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-emerald-400" />
                No Report Available
              </CardTitle>
              <CardDescription className="text-slate-400">
                Generate a detailed security report for this scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 mb-4">
                  This scan doesn't have a generated report yet. Click below to create one using AI analysis.
                </p>
                <Button
                  onClick={generateReport}
                  disabled={isGenerating || scan?.status !== 'completed'}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
                {scan?.status !== 'completed' && (
                  <p className="text-sm text-slate-400 mt-2">
                    Report can only be generated after scan completion
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Report Content */
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">
                Overview
              </TabsTrigger>
              <TabsTrigger value="findings" className="data-[state=active]:bg-emerald-600">
                Findings ({report.findings?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="data-[state=active]:bg-emerald-600">
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="export" className="data-[state=active]:bg-emerald-600">
                Export
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Executive Summary */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-emerald-400" />
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${getRiskScoreColor(report.risk_score)}`}>
                        {report.risk_score}/10
                      </div>
                      <p className="text-slate-400">Risk Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">
                        {report.findings?.length || 0}
                      </div>
                      <p className="text-slate-400">Total Findings</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-400 mb-2">
                        {report.findings?.filter(f => f.severity === 'critical').length || 0}
                      </div>
                      <p className="text-slate-400">Critical Issues</p>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 leading-relaxed">{report.summary}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Scan Details */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-emerald-400" />
                    Scan Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-400">Target</label>
                        <p className="text-white">{scan?.target}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Tool Used</label>
                        <p className="text-white">{scan?.tool_used}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">AI Model</label>
                        <p className="text-white">{scan?.ai_model}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-400">Scan Duration</label>
                        <p className="text-white">
                          {scan?.end_time && scan?.start_time
                            ? `${Math.round((new Date(scan.end_time).getTime() - new Date(scan.start_time).getTime()) / 1000)}s`
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Generated</label>
                        <p className="text-white">{new Date(report.generated_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-400">Status</label>
                        <Badge className={getSeverityBadge(scan?.status || 'unknown')}>
                          {scan?.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Findings Tab */}
            <TabsContent value="findings" className="space-y-4">
              {report.findings && report.findings.length > 0 ? (
                report.findings.map((finding, index) => (
                  <Card key={index} className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(finding.severity)}
                          <div>
                            <CardTitle className="text-white">{finding.title}</CardTitle>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getSeverityBadge(finding.severity)}>
                                {finding.severity.toUpperCase()}
                              </Badge>
                              {finding.cve_refs && finding.cve_refs.map(cve => (
                                <Badge key={cve} variant="outline" className="border-slate-500 text-slate-300">
                                  {cve}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Description</h4>
                          <p className="text-slate-300">{finding.description}</p>
                        </div>

                        {finding.evidence && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-2">Evidence</h4>
                            <div className="bg-slate-900 p-3 rounded border border-slate-600">
                              <code className="text-sm text-green-400">{finding.evidence}</code>
                            </div>
                          </div>
                        )}

                        {finding.affected_urls && finding.affected_urls.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-2">Affected URLs</h4>
                            <div className="space-y-1">
                              {finding.affected_urls.map((url, urlIndex) => (
                                <a
                                  key={urlIndex}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-emerald-400 hover:text-emerald-300 text-sm"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">Recommendation</h4>
                          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded">
                            <p className="text-emerald-300">{finding.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Security Issues Found</h3>
                    <p className="text-slate-400">
                      The scan completed successfully without detecting any security vulnerabilities.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-emerald-400" />
                    Security Recommendations
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Prioritized recommendations for improving security posture
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.recommendations && report.recommendations.length > 0 ? (
                    <div className="space-y-4">
                      {report.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                          <div className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <p className="text-slate-300 leading-relaxed">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No specific recommendations available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Download className="h-5 w-5 mr-2 text-emerald-400" />
                    Export Report
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Download this security report in various formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                      onClick={() => exportReport('pdf')}
                      disabled={isExporting}
                      className="bg-red-600 hover:bg-red-700 h-16 flex-col"
                    >
                      <FileText className="h-6 w-6 mb-1" />
                      PDF Report
                    </Button>
                    <Button
                      onClick={() => exportReport('json')}
                      disabled={isExporting}
                      className="bg-blue-600 hover:bg-blue-700 h-16 flex-col"
                    >
                      <FileText className="h-6 w-6 mb-1" />
                      JSON Data
                    </Button>
                    <Button
                      onClick={() => exportReport('xml')}
                      disabled={isExporting}
                      className="bg-purple-600 hover:bg-purple-700 h-16 flex-col"
                    >
                      <FileText className="h-6 w-6 mb-1" />
                      XML Format
                    </Button>
                    <Button
                      onClick={() => exportReport('csv')}
                      disabled={isExporting}
                      className="bg-green-600 hover:bg-green-700 h-16 flex-col"
                    >
                      <FileText className="h-6 w-6 mb-1" />
                      CSV Export
                    </Button>
                  </div>
                  {isExporting && (
                    <Alert className="mt-4 border-emerald-500/50 bg-emerald-500/10">
                      <Download className="h-4 w-4 text-emerald-400" />
                      <AlertDescription className="text-emerald-400">
                        Preparing report export... This may take a few moments.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
