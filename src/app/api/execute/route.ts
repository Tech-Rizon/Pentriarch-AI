import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase'
import { routeToolCommand, validateCommand, SECURITY_TOOLS, type Command } from '@/lib/toolsRouter'
import { dockerManager } from '@/lib/dockerManager'
import { insertScan, updateScanStatus, insertScanLog } from '@/lib/supabase'
import { WebSocketBroadcaster } from '@/lib/websocket'
import { getErrorMessage } from '@/lib/auth-helpers'

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tool, target, flags, timeout, description } = await request.json()

    if (!tool || !target) {
      return NextResponse.json({
        error: 'Tool and target are required'
      }, { status: 400 })
    }

    // Validate tool exists
    const toolInfo = SECURITY_TOOLS.find(t => t.id === tool)
    if (!toolInfo) {
      return NextResponse.json({
        error: `Tool '${tool}' not found`
      }, { status: 400 })
    }

    // Check user permissions for high-risk tools
    if (toolInfo.risk_level === 'critical' && (user as any)?.plan !== 'enterprise') {
      return NextResponse.json({
        error: 'Critical risk tools require enterprise plan'
      }, { status: 403 })
    }

    // Generate and validate command
    const command = routeToolCommand(tool, target, flags)
    command.timeout = timeout || toolInfo.max_execution_time

    const validation = validateCommand(command)
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid command',
        details: validation.errors
      }, { status: 400 })
    }

    // Create scan record
    const scan = await insertScan({
      user_id: user.id,
      target,
      prompt: description || `Direct execution of ${tool} on ${target}`,
      status: 'queued',
      ai_model: 'direct-execution',
      tool_used: tool,
      command_executed: JSON.stringify(command),
      start_time: new Date().toISOString()
    })

    // Execute command in background
    executeCommandAsync(scan.id, command, user.id)

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      tool: toolInfo.name,
      command: command,
      estimatedTime: command.timeout
    })

  } catch (error) {
    console.error('Execute API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: getErrorMessage(error)
    }, { status: 500 })
  }
}

// Background execution function
async function executeCommandAsync(scanId: string, command: Command, userId: string) {
  const broadcaster = WebSocketBroadcaster.getInstance()

  try {
    await updateScanStatus(scanId, 'running')

    // Broadcast scan start
    broadcaster.broadcastScanProgress(scanId, userId, {
      scanId,
      status: 'starting',
      progress: 0,
      currentStep: `Starting ${command.tool} execution`,
      estimatedTimeRemaining: command.timeout
    })

    await insertScanLog({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting direct execution: ${command.tool}`,
      raw_output: JSON.stringify(command)
    })

    // Broadcast container status
    broadcaster.broadcastContainerStatus(scanId, userId, {
      scanId,
      status: 'creating',
      uptime: '0s',
      memoryUsage: 'N/A',
      cpuUsage: 'N/A'
    })

    // Broadcast scan running status
    broadcaster.broadcastScanProgress(scanId, userId, {
      scanId,
      status: 'running',
      progress: 25,
      currentStep: `Executing ${command.tool}`,
      estimatedTimeRemaining: command.timeout
    })

    const result = await dockerManager.executeCommand(
      command,
      scanId,
      (output) => {
        // Real-time output logging
        insertScanLog({
          scan_id: scanId,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Command output',
          raw_output: output
        }).catch(console.error)

        // Broadcast real-time output
        broadcaster.broadcastScanProgress(scanId, userId, {
          scanId,
          status: 'running',
          progress: 50,
          currentStep: 'Processing output',
          output: output
        })
      }
    )

    if (result.success) {
      await updateScanStatus(scanId, 'completed', {
        execution_result: result,
        output_length: result.output.length,
        execution_duration: result.duration,
        direct_execution: true
      })

      await insertScanLog({
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Command completed successfully',
        raw_output: `Execution time: ${result.duration}ms`
      })

      // Broadcast completion
      broadcaster.broadcastScanComplete(scanId, userId, {
        scanId,
        duration: result.duration,
        exitCode: 0,
        output: result.output
      })

      // Broadcast final container status
      broadcaster.broadcastContainerStatus(scanId, userId, {
        scanId,
        status: 'stopped',
        uptime: `${Math.round(result.duration / 1000)}s`,
        memoryUsage: 'Released',
        cpuUsage: '0%'
      })

    } else {
      await updateScanStatus(scanId, 'failed', {
        execution_error: result.error,
        execution_duration: result.duration,
        direct_execution: true
      })

      await insertScanLog({
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Command execution failed',
        raw_output: result.error || 'Unknown error'
      })

      // Broadcast error
      broadcaster.broadcastScanError(scanId, userId, {
        message: result.error || 'Command execution failed',
        details: { duration: result.duration }
      })

      // Broadcast container stop
      broadcaster.broadcastContainerStatus(scanId, userId, {
        scanId,
        status: 'error',
        uptime: `${Math.round((result.duration || 0) / 1000)}s`,
        memoryUsage: 'Released',
        cpuUsage: '0%'
      })
    }

  } catch (error) {
    console.error(`Direct execution failed for scan ${scanId}:`, error)
    await updateScanStatus(scanId, 'failed', {
      execution_error: getErrorMessage(error),
      direct_execution: true
    })

    await insertScanLog({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Execution system error',
      raw_output: getErrorMessage(error)
    })
  }
}
