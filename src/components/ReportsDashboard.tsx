"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, RefreshCw, Shield, Eye, AlertTriangle } from "lucide-react"
import { getCurrentUserClient, getScansForUser, type Scan } from "@/lib/supabase"
import ReportDetail from "@/components/ReportDetail"

export default function ReportsDashboard() {
  const [user, setUser] = useState<any>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    }
    load().catch(() => {})
  }, [])

  useEffect(() => {
    if (!user?.id) return
    loadReports().catch(() => {})
  }, [user])

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const userScans = await getScansForUser(user.id)
      const completed = userScans.filter((scan) => scan.status === "completed")
      setScans(completed)
    } catch (error) {
      console.error("Failed to load reports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (selectedScanId) {
    return <ReportDetail scanId={selectedScanId} onClose={() => setSelectedScanId(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Reports</h1>
              <p className="text-slate-400">Browse completed scans and export security reports</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={loadReports}
            disabled={isLoading}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FileText className="h-5 w-5 mr-2 text-emerald-400" />
              Completed Scans ({scans.length})
            </CardTitle>
            <CardDescription className="text-slate-400">
              Reports are generated from completed scans only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
            ) : scans.length === 0 ? (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  No completed scans yet. Run a scan to generate reports.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {scans.map((scan) => (
                  <div key={scan.id} className="border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-white">{scan.target}</h3>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            completed
                          </Badge>
                          {scan.tool_used && (
                            <Badge variant="outline" className="border-slate-500 text-slate-300">
                              {scan.tool_used}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{scan.prompt}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                        onClick={() => setSelectedScanId(scan.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
