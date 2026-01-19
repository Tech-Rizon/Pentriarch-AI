import { routeToolCommand, commandToToolString, sanitizeTargetHost, sanitizeTargetUrl } from "@/lib/toolsRouter"

export type ScanType = "headers_tls" | "passive_web"

export type ScanRunnerDefinition = {
  scanType: ScanType
  tool: "nmap" | "whatweb"
  flags: string[]
  timeoutSeconds: number
  active: boolean
  description: string
}

export const SCAN_RUNNERS: Record<ScanType, ScanRunnerDefinition> = {
  headers_tls: {
    scanType: "headers_tls",
    tool: "nmap",
    flags: ["-p", "443", "--script", "ssl-enum-ciphers,ssl-cert", "--host-timeout=120s"],
    timeoutSeconds: 180,
    active: false,
    description: "TLS and certificate surface checks"
  },
  passive_web: {
    scanType: "passive_web",
    tool: "whatweb",
    flags: ["-a", "3", "--max-threads", "5", "--color=never"],
    timeoutSeconds: 120,
    active: false,
    description: "Passive web fingerprinting"
  }
}

export const getScanRunner = (scanType: string): ScanRunnerDefinition | null => {
  if (scanType in SCAN_RUNNERS) {
    return SCAN_RUNNERS[scanType as ScanType]
  }
  return null
}

export const buildScanCommand = (scanType: ScanType, baseUrl: string, host: string) => {
  const runner = SCAN_RUNNERS[scanType]
  const targetValue =
    runner.tool === "nmap" ? sanitizeTargetHost(host) : sanitizeTargetUrl(baseUrl)
  const command = routeToolCommand(runner.tool, targetValue, runner.flags)
  const shellCommand = commandToToolString(command)
  return {
    command,
    shellCommand,
    timeoutSeconds: runner.timeoutSeconds,
    tool: runner.tool
  }
}
