import { type NextRequest, NextResponse } from 'next/server'
import { ensureUserProfileServer, getCurrentUserServer, insertScanLogServer, insertScanServer, updateScanStatusServer } from '@/lib/supabase'
import { routeToolCommand, validateCommand, SECURITY_TOOLS, commandToToolString, type Command } from '@/lib/toolsRouter'
import { dockerManager } from '@/lib/dockerManager'
import { WebSocketBroadcaster } from '@/lib/websocket'

// Mark as dynamic to skip build-time generation
export const dynamic = 'force-dynamic'
import { getErrorMessage } from '@/lib/auth-helpers'

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const commandPayload = body?.command ?? {}
    const scanIdFromBody = body?.scanId as string | undefined

    const tool = body?.tool ?? commandPayload?.tool
    const target = body?.target ?? commandPayload?.target
    const flags = body?.flags ?? commandPayload?.flags
    const timeout = body?.timeout ?? commandPayload?.timeout
    const description = body?.description ?? commandPayload?.prompt ?? commandPayload?.description

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
    const shellCommand = commandToToolString(command)
    command.timeout = timeout || toolInfo.max_execution_time

    const validation = validateCommand(command)
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid command',
        details: validation.errors
      }, { status: 400 })
    }

    // Create scan record unless one already exists
    if (!scanIdFromBody) {
      await ensureUserProfileServer(user)
    }
    const scanId = scanIdFromBody || (await insertScanServer({
      user_id: user.id,
      target,
      prompt: description || `Direct execution of ${tool} on ${target}`,
      status: 'queued',
      ai_model: 'direct-execution',
      tool_used: tool,
      command_executed: JSON.stringify(command),
      start_time: new Date().toISOString()
    })).id

    // Execute command in background
    executeCommandAsync(scanId, shellCommand, toolInfo.id, user.id, command.timeout)

    return NextResponse.json({
      success: true,
      scanId: scanId,
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
async function executeCommandAsync(scanId: string, command: string, toolId: string, userId: string, timeoutSeconds?: number) {
  const broadcaster = WebSocketBroadcaster.getInstance()

  try {
    await updateScanStatusServer(scanId, 'running')

    // Broadcast scan start
    broadcaster.broadcastScanProgress(scanId, userId, {
      scanId,
      status: 'starting',
      progress: 0,
      currentStep: `Starting ${toolId} execution`,
      estimatedTimeRemaining: timeoutSeconds
    })

    await insertScanLogServer({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting direct execution: ${toolId}`,
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
      currentStep: `Executing ${toolId}`,
      estimatedTimeRemaining: timeoutSeconds
    })

    const result = await dockerManager.executeCommand(
      command,
      scanId,
      (output) => {
        // Real-time output logging
        insertScanLogServer({
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
      },
      typeof timeoutSeconds === 'number' ? timeoutSeconds * 1000 : undefined,
      userId
    )

    if (result.success) {
      await updateScanStatusServer(scanId, 'completed', {
        execution_result: result,
        output_length: result.output.length,
        execution_duration: result.duration,
        direct_execution: true
      })

      await insertScanLogServer({
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
      await updateScanStatusServer(scanId, 'failed', {
        execution_error: result.error,
        execution_duration: result.duration,
        direct_execution: true
      })

      await insertScanLogServer({
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
    await updateScanStatusServer(scanId, 'failed', {
      execution_error: getErrorMessage(error),
      direct_execution: true
    })

    await insertScanLogServer({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Execution system error',
      raw_output: getErrorMessage(error)
    })
  }
}
