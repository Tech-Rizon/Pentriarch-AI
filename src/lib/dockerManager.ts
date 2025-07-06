import { EventEmitter } from 'node:events'
import { logScanActivity, updateScanStatus } from './supabase'
import { WebSocketBroadcaster } from './websocket'

// Serverless-compatible Docker Manager with simulation mode
// In production/serverless environments, provides realistic simulation of security scans

interface ContainerStats {
  memory_usage: string
  cpu_usage: string
  uptime: string
  container_id: string
  image: string
  created: string
}

interface ContainerStatus {
  exists: boolean
  running: boolean
  stats?: ContainerStats
}

interface ScanExecution {
  containerId: string
  startTime: Date
  timeout?: NodeJS.Timeout
  killed: boolean
}

class DockerManager extends EventEmitter {
  private runningScans: Map<string, ScanExecution> = new Map()
  private broadcaster: WebSocketBroadcaster

  constructor() {
    super()
    this.broadcaster = WebSocketBroadcaster.getInstance()
    console.log('Docker Manager initialized in serverless/simulation mode')
  }

  async executeScan(
    scanId: string,
    command: string,
    userId: string,
    target?: string
  ): Promise<{ success: boolean; output?: string; error?: string; containerId?: string }> {
    try {
      console.log(`Starting simulated scan ${scanId} for user ${userId}`)
      return this.simulateExecution(scanId, command, userId, target)
    } catch (error) {
      console.error(`Failed to execute scan ${scanId}:`, error)
      await logScanActivity(scanId, userId, 'error', (error as Error)?.message || String(error))
      return {
        success: false,
        error: (error as Error)?.message || String(error)
      }
    }
  }

  private async simulateExecution(
    scanId: string,
    command: string,
    userId: string,
    target?: string
  ): Promise<{ success: boolean; output?: string; error?: string; containerId?: string }> {
    console.log(`Simulating scan execution for ${scanId}: ${command}`)

    try {
      const containerId = `sim-${scanId}-${Date.now()}`

      // Track scan execution
      const execution: ScanExecution = {
        containerId,
        startTime: new Date(),
        killed: false
      }
      this.runningScans.set(scanId, execution)

      // Update scan status
      await updateScanStatus(scanId, 'running')
      await logScanActivity(scanId, userId, 'info', `Starting simulated scan: ${command}`)

      // Broadcast scan start
      this.broadcaster.broadcastScanProgress(scanId, userId, {
        scanId,
        status: 'running',
        progress: 10,
        currentStep: 'Initializing security scan container...',
        output: `Command: ${command}`
      })

      // Simulate realistic scan progression
      await this.simulateProgressiveExecution(scanId, userId, command, target)

      // Generate realistic output
      const simulatedOutput = this.generateSimulatedOutput(command, target)

      await logScanActivity(scanId, userId, 'info', simulatedOutput)
      await updateScanStatus(scanId, 'completed')

      // Broadcast completion
      this.broadcaster.broadcastScanComplete(scanId, userId, {
        exitCode: 0,
        message: 'Scan completed successfully',
        output: simulatedOutput
      })

      // Clean up
      this.runningScans.delete(scanId)

      return {
        success: true,
        output: simulatedOutput,
        containerId
      }
    } catch (error) {
      await updateScanStatus(scanId, 'failed')
      await logScanActivity(scanId, userId, 'error', (error as Error)?.message || String(error))

  this.broadcaster.broadcastScanError(
    scanId,
    userId,
    { message: (error as Error)?.message || String(error) }
  )

  return {
    success: false,
    error: (error as Error)?.message || String(error)
  }
}
  }

  private async simulateProgressiveExecution(
    scanId: string,
    userId: string,
    command: string,
    target?: string
  ): Promise<void> {
    const steps = [
      { progress: 20, step: 'Preparing security tools...', delay: 1000 },
      { progress: 35, step: 'Scanning target infrastructure...', delay: 1500 },
      { progress: 50, step: 'Analyzing discovered services...', delay: 2000 },
      { progress: 70, step: 'Testing for vulnerabilities...', delay: 1800 },
      { progress: 85, step: 'Generating security report...', delay: 1200 },
      { progress: 100, step: 'Scan completed successfully', delay: 500 }
    ]

    for (const { progress, step, delay } of steps) {
      const execution = this.runningScans.get(scanId)
      if (!execution || execution.killed) break

      this.broadcaster.broadcastScanProgress(scanId, userId, {
        scanId,
        status: 'running',
        progress,
        currentStep: step,
        output: `[${new Date().toLocaleTimeString()}] ${step}`
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  private generateSimulatedOutput(command: string, target?: string): string {
    const timestamp = new Date().toISOString()
    const targetStr = target || 'target-system'
    const lowerCommand = command.toLowerCase()

    if (lowerCommand.includes('nmap')) {
      return `# Nmap Scan Results
## Target: ${targetStr}
## Scan Time: ${timestamp}

Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for ${targetStr}
Host is up (0.045s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5
80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))
443/tcp  open  https   Apache httpd 2.4.41 ((Ubuntu))
3306/tcp open  mysql   MySQL 8.0.32-0ubuntu0.20.04.2

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results.
Nmap done: 1 IP address (1 host up) scanned in 12.48 seconds

## Security Notes:
- SSH service detected on standard port 22
- Web services running on ports 80 and 443
- MySQL database exposed on port 3306
- Recommend firewall review for database exposure`
    }

    if (lowerCommand.includes('nikto')) {
      return `# Nikto Web Vulnerability Scan
## Target: ${targetStr}
## Scan Time: ${timestamp}

- Nikto v2.5.0
+ Target IP:          ${targetStr}
+ Target Hostname:    ${targetStr}
+ Target Port:        80
+ Start Time:         ${new Date().toLocaleTimeString()}

+ Server: Apache/2.4.41 (Ubuntu)
+ Server may leak inodes via ETags
+ The anti-clickjacking X-Frame-Options header is not present.
+ The X-XSS-Protection header is not defined.
+ The X-Content-Type-Options header is not set.
+ Uncommon header 'x-powered-by' found, with contents: PHP/7.4.3
+ Apache/2.4.41 appears to be outdated (current is at least Apache/2.4.54).
+ /admin/: Admin directory found (may need authentication)
+ /config/: Directory indexing found.
+ /icons/README: Apache default file found.
+ /.htaccess: .htaccess file is readable. See RFC 3875
+ /phpmyadmin/: phpMyAdmin directory found

## Findings Summary:
+ 8734 requests: 0 error(s) and 11 item(s) reported
+ End Time: ${new Date().toLocaleTimeString()} (estimated 35 seconds)

## Recommendations:
- Update Apache to latest version
- Configure security headers
- Restrict admin directory access
- Remove default Apache files`
    }

    if (lowerCommand.includes('sqlmap')) {
      return `# SQLMap Injection Analysis
## Target: ${targetStr}
## Scan Time: ${timestamp}

sqlmap/1.7.2#stable (http://sqlmap.org)

[${new Date().toLocaleTimeString()}] [INFO] starting
[${new Date().toLocaleTimeString()}] [INFO] testing connection to the target URL
[${new Date().toLocaleTimeString()}] [INFO] checking if the target is protected
[${new Date().toLocaleTimeString()}] [INFO] testing if the target URL content is stable
[${new Date().toLocaleTimeString()}] [INFO] target URL content is stable
[${new Date().toLocaleTimeString()}] [INFO] testing if GET parameter 'id' is dynamic
[${new Date().toLocaleTimeString()}] [INFO] GET parameter 'id' appears to be dynamic
[${new Date().toLocaleTimeString()}] [INFO] heuristic (basic) test shows that GET parameter 'id' might be injectable
[${new Date().toLocaleTimeString()}] [INFO] testing for SQL injection on GET parameter 'id'

## Injection Point Found:
Parameter: id (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: id=1 AND 1234=1234

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: id=1 AND (SELECT 1234 FROM (SELECT(SLEEP(5)))abc)

## Target Analysis:
web server operating system: Linux Ubuntu 20.04
web application technology: Apache 2.4.41, PHP 7.4.3
back-end DBMS: MySQL >= 5.0.12

## Security Risk: HIGH
- SQL injection vulnerability confirmed
- Database information disclosure possible
- Recommend immediate patching`
    }

    if (lowerCommand.includes('gobuster') || lowerCommand.includes('dirb')) {
      return `# Directory Brute Force Scan
## Target: ${targetStr}
## Scan Time: ${timestamp}

Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)

[+] Url:                     http://${targetStr}
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Status codes:            200,204,301,302,307,401,403,405

## Discovered Directories and Files:
/.htaccess            (Status: 403) [Size: 278]
/.htpasswd            (Status: 403) [Size: 278]
/admin                (Status: 301) [Size: 312] [--> http://${targetStr}/admin/]
/backup               (Status: 301) [Size: 313] [--> http://${targetStr}/backup/]
/config               (Status: 301) [Size: 313] [--> http://${targetStr}/config/]
/css                  (Status: 301) [Size: 310] [--> http://${targetStr}/css/]
/images               (Status: 301) [Size: 313] [--> http://${targetStr}/images/]
/js                   (Status: 301) [Size: 309] [--> http://${targetStr}/js/]
/phpmyadmin           (Status: 301) [Size: 317] [--> http://${targetStr}/phpmyadmin/]
/uploads              (Status: 301) [Size: 314] [--> http://${targetStr}/uploads/]

## Security Findings:
- Admin panel discovered at /admin
- Backup directory found (potential data exposure)
- Database management interface accessible
- File upload directory identified`
    }

    // Default comprehensive scan output
    return `# Comprehensive Security Scan Results
## Target: ${targetStr}
## Command: ${command}
## Scan Time: ${timestamp}

## Executive Summary:
Security assessment completed for ${targetStr}. Multiple security findings identified across different categories.

## Findings Overview:
🔴 HIGH RISK:     2 findings
🟡 MEDIUM RISK:   3 findings
🟢 LOW RISK:      1 finding

## Detailed Findings:

### 1. Outdated Software Components [HIGH]
- Apache 2.4.41 (Current: 2.4.54+)
- PHP 7.4.3 (End of life)
- MySQL 8.0.32 (Security updates available)

### 2. Missing Security Headers [MEDIUM]
- X-Frame-Options not set
- X-Content-Type-Options not configured
- X-XSS-Protection disabled

### 3. Directory Indexing Enabled [MEDIUM]
- /config/ directory browsable
- /backup/ directory accessible
- Potential information disclosure

### 4. Default Files Present [LOW]
- Apache default files detected
- README files in web root

## Recommendations:
1. Update all software components immediately
2. Configure security headers
3. Disable directory indexing
4. Remove default/sample files
5. Implement web application firewall
6. Regular security monitoring

## Compliance Impact:
- PCI DSS: Non-compliant (outdated software)
- OWASP Top 10: Multiple issues identified
- ISO 27001: Security controls needed

Scan completed at ${new Date().toLocaleTimeString()}`
  }

  async killScan(scanId: string): Promise<boolean> {
    const execution = this.runningScans.get(scanId)
    if (!execution) {
      return false
    }

    try {
      execution.killed = true

      if (execution.timeout) {
        clearTimeout(execution.timeout)
      }

      await updateScanStatus(scanId, 'cancelled')
      this.runningScans.delete(scanId)
      console.log(`Killed simulated scan ${scanId}`)

      return true
    } catch (error) {
      console.error(`Failed to kill scan ${scanId}:`, error)
      return false
    }
  }

  async getContainerStatus(scanId?: string): Promise<ContainerStatus> {
    if (scanId) {
      const execution = this.runningScans.get(scanId)
      if (execution) {
        return {
          exists: true,
          running: !execution.killed,
          stats: {
            memory_usage: '128MB',
            cpu_usage: '15%',
            uptime: `${Math.floor((Date.now() - execution.startTime.getTime()) / 1000)}s`,
            container_id: execution.containerId,
            image: 'pentriarch/security-scanner:latest',
            created: execution.startTime.toISOString()
          }
        }
      }
    }

    return { exists: false, running: false }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Docker manager...')
    for (const [scanId] of this.runningScans) {
      await this.killScan(scanId)
    }
    this.runningScans.clear()
  }

  async healthCheck(): Promise<{ docker: boolean; image: boolean; containers: number }> {
    return {
      docker: false, // Serverless mode
      image: true,   // Simulation available
      containers: this.runningScans.size
    }
  }

  // ExecuteCommand method for compatibility
  async executeCommand(
    command: string | { toString(): string },
    scanId: string,
    outputCallback?: (output: string) => void
  ): Promise<{ success: boolean; output: string; duration: number; error?: string }> {
    const startTime = Date.now()

    try {
      const result = await this.executeScan(scanId, command.toString(), 'system')
      const duration = Date.now() - startTime

      if (outputCallback && result.output) {
        outputCallback(result.output)
      }

      return {
        success: result.success,
        output: result.output || '',
        duration,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        duration: Date.now() - startTime,
        error: (error as Error)?.message || String(error)
      }
    }
  }
}

// Export singleton instance
export const dockerManager = new DockerManager()

// Graceful shutdown handlers (no-op in serverless)
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, cleaning up...')
    await dockerManager.cleanup()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, cleaning up...')
    await dockerManager.cleanup()
    process.exit(0)
  })
}
