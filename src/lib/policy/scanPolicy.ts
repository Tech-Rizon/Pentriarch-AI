import type { ScanRunnerDefinition } from "@/lib/scanRunners"

export type TargetScope = {
  allowedPathPrefixes: string[]
  excludedPathPrefixes: string[]
  maxRequestsPerMinute: number
  maxConcurrency: number
}

export type TargetRecord = {
  id: string
  host: string
  base_url: string
  verified: boolean
  active_scans_allowed: boolean
  scope: TargetScope | null
}

export type ScanApprovalResult = {
  approved: boolean
  reason?: string
}

export const approveScanRequest = (
  target: TargetRecord,
  runner: ScanRunnerDefinition
): ScanApprovalResult => {
  if (runner.active && !target.active_scans_allowed) {
    return { approved: false, reason: "Active scans are not enabled for this target." }
  }

  if (!target.host || !target.base_url) {
    return { approved: false, reason: "Target configuration is incomplete." }
  }

  return { approved: true }
}
