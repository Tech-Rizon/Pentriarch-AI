// src/components/AssetsDashboard.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Copy, RefreshCw } from 'lucide-react'
import { getAccessTokenClient } from '@/lib/supabase'

type TargetScope = {
  allowedPathPrefixes?: string[]
  excludedPathPrefixes?: string[]
  maxRequestsPerMinute?: number
  maxConcurrency?: number
}

type Target = {
  id: string
  base_url: string
  host: string
  verified: boolean
  active_scans_allowed: boolean
  scope?: TargetScope | null
  created_at: string
}

export default function AssetsDashboard() {
  const [targets, setTargets] = useState<Target[]>([])
  const [baseUrl, setBaseUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadTargets = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = await getAccessTokenClient()
      const response = await fetch('/api/targets', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to load targets')
      }
      const data = await response.json()
      setTargets(data.targets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load targets')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTargets()
  }, [])

  const handleAddTarget = async () => {
    if (!baseUrl.trim()) return
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)
      const token = await getAccessTokenClient()
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ base_url: baseUrl.trim() })
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to add target')
      }
      const data = await response.json()
      setTargets((prev) => [data.target, ...prev])
      setBaseUrl('')
      setSuccess('Target added successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add target')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setSuccess('Copied target ID to clipboard.')
      setTimeout(() => setSuccess(null), 2000)
    } catch {
      setError('Failed to copy target ID.')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            Assets (Targets)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <AlertDescription className="text-emerald-300">{success}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="https://pentriarch.com"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Button
              onClick={handleAddTarget}
              disabled={isLoading || !baseUrl.trim()}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Add Target
            </Button>
            <Button
              variant="outline"
              onClick={loadTargets}
              className="border-slate-600 text-slate-300"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Onboarded Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-slate-400">No targets added yet.</p>
          ) : (
            <div className="space-y-3">
              {targets.map((target) => (
                <div
                  key={target.id}
                  className="border border-slate-700 rounded-lg p-4 bg-slate-900/40"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">{target.base_url}</p>
                      <p className="text-slate-400 text-sm">Target ID: {target.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={target.active_scans_allowed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}>
                        {target.active_scans_allowed ? 'Scans Allowed' : 'Scans Disabled'}
                      </Badge>
                      <Badge className={target.verified ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/30'}>
                        {target.verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                        onClick={() => copyToClipboard(target.id)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy ID
                      </Button>
                    </div>
                  </div>
                  {target.scope && (
                    <div className="mt-3 text-sm text-slate-400">
                      <span>Allowed paths: {target.scope.allowedPathPrefixes?.join(', ') || '/'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
