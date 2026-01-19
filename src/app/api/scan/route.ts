import { type NextRequest, NextResponse } from 'next/server'
import { ensureUserProfileServer, getCurrentUserServer, insertScanServer, updateScanStatusServer } from '@/lib/supabase'
import { mcpRouter, selectOptimalModel } from '@/lib/mcpRouter'
import { runAgentWorkflow } from '@/lib/agentWorkflow'
import { routeToolCommand, parseAIResponse, commandToToolString } from '@/lib/toolsRouter'
import { buildScanPlan } from '@/lib/scanPlanner'
import { dockerManager } from '@/lib/dockerManager'
import { approveScanRequest } from '@/lib/policy/scanPolicy'
import { buildScanCommand, getScanRunner } from '@/lib/scanRunners'
import { requireEntitlement } from '@/lib/policy/entitlementMiddleware'

export const runtime = "nodejs";

const parseAllowedTargets = () =>
  (process.env.ALLOWED_SCAN_TARGETS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

const normalizeTargetHost = (target: string) => {
  const trimmed = target.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const url = new URL(withProtocol)
    return url.hostname.toLowerCase()
  } catch {
    return trimmed.toLowerCase()
  }
}

const isTargetAllowed = (host: string, allowed: string[]) => {
  if (allowed.length === 0) return false
  return allowed.some((entry) => {
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1)
      return host.endsWith(suffix)
    }
    return host === entry
  })
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    // Parse request body
    const { prompt, target, preferredModel, userPlan = 'free', authorizationConfirmed, targetId, scanType } = await request.json()

    if (targetId && scanType) {
      const runner = getScanRunner(scanType)
      if (!runner) {
        return NextResponse.json({ error: 'Unsupported scan type' }, { status: 400 })
      }

      const entitlementResult = await requireEntitlement({
        userId: user.id,
        targetId,
        scanType
      })

      if (!entitlementResult.ok) {
        return NextResponse.json(
          { error: 'Scan not allowed', details: entitlementResult.reason },
          { status: 403 }
        )
      }

      const approval = approveScanRequest({
        id: entitlementResult.target.id,
        host: entitlementResult.target.host,
        base_url: entitlementResult.target.base_url,
        verified: entitlementResult.target.verified,
        active_scans_allowed: entitlementResult.target.active_scans_allowed,
        scope: entitlementResult.target.scope
      }, runner)

      if (!approval.approved) {
        return NextResponse.json(
          { error: 'Scan not approved', details: approval.reason },
          { status: 403 }
        )
      }

      await ensureUserProfileServer(user)
      const scan = await insertScanServer({
        user_id: user.id,
        target: entitlementResult.target.base_url,
        prompt: `scan_type:${scanType}`,
        status: 'queued',
        ai_model: 'policy-runner',
        start_time: new Date().toISOString()
      })

      const { command, shellCommand, timeoutSeconds, tool } = buildScanCommand(
        scanType,
        entitlementResult.target.base_url,
        entitlementResult.target.host
      )

      await updateScanStatusServer(scan.id, 'running', {
        scan_type: scanType,
        runner: runner.description,
        scope: entitlementResult.target.scope,
        entitlement_plan: entitlementResult.entitlement.plan
      }, {
        tool_used: tool,
        command_executed: JSON.stringify(command)
      })

      executeCommandAsync(scan.id, shellCommand, timeoutSeconds, user.id)

      return NextResponse.json({
        success: true,
        scanId: scan.id,
        scanType,
        command,
        model: 'policy-runner'
      })
    }

    // Input validation
    // Validate target as domain, IP, or URL
    const isValidTarget = typeof target === 'string' && (
      /^([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(target) || // domain
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target) || // IPv4
      /^(https?:\/\/)?([\w.-]+)\.([a-z\.]{2,6})([\/\w .-]*)*\/?$/.test(target) // URL
    );
    if (!isValidTarget) {
      return NextResponse.json({ error: 'Invalid target format' }, { status: 400 });
    }

    if (authorizationConfirmed !== true) {
      return NextResponse.json(
        { error: 'Authorization required', details: 'Confirm you own or have explicit permission to test this target.' },
        { status: 403 }
      )
    }

    const allowedTargets = parseAllowedTargets()
    const targetHost = normalizeTargetHost(target)
    if (!isTargetAllowed(targetHost, allowedTargets)) {
      return NextResponse.json(
        { error: 'Target not allowed', details: 'Target is not in the allowed list for scans.' },
        { status: 403 }
      )
    }

    // Validate prompt length and content
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    // Validate preferredModel and userPlan
    const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022', 'deepseek-chat'];
    if (preferredModel && !allowedModels.includes(preferredModel)) {
      return NextResponse.json({ error: 'Invalid model selection' }, { status: 400 });
    }
    const allowedPlans = ['free', 'pro', 'enterprise'];
    if (userPlan && !allowedPlans.includes(userPlan)) {
      return NextResponse.json({ error: 'Invalid user plan' }, { status: 400 });
    }

    const useAgentWorkflow = process.env.AGENT_WORKFLOW_ENABLED === 'true'
    const agentModelId = process.env.AGENT_MODEL || 'gpt-4.1'

    // Select optimal AI model based on prompt complexity (fallback path)
    const selectedModel = selectOptimalModel(prompt, preferredModel, userPlan)
    const scanModelId = useAgentWorkflow ? agentModelId : selectedModel.id

    console.log(`Selected model: ${useAgentWorkflow ? `Agent Workflow (${agentModelId})` : selectedModel.name} for prompt complexity`)

    // Create scan record
    await ensureUserProfileServer(user)
    const scan = await insertScanServer({
      user_id: user.id,
      target,
      prompt,
      status: 'queued',
      ai_model: scanModelId,
      start_time: new Date().toISOString()
    })

    // Generate AI system prompt for penetration testing
    const systemPrompt = `You are a professional penetration testing assistant. Your role is to analyze user requests and recommend appropriate security testing tools and commands.

Available tools: nmap, nikto, sqlmap, wpscan, gobuster, whatweb, masscan

For each request, provide a JSON response with the following structure:
{
  "tool": "recommended_tool_name",
  "target": "${target}",
  "reasoning": "explanation of why this tool is appropriate",
  "confidence": 0.8,
  "flags": ["--flag1", "--flag2"],
  "estimated_time": 300,
  "risk_assessment": "low|medium|high|critical"
}

Guidelines:
- Always prioritize user safety and legal compliance
- Start with reconnaissance tools (nmap, whatweb) before more invasive testing
- For web applications, suggest nikto or gobuster for initial assessment
- Only suggest sqlmap if there's specific indication of potential SQL injection
- Provide clear reasoning for tool selection
- Estimate realistic execution time
- Assess risk level appropriately

User request: "${prompt}"
Target: "${target}"`

    try {
      // Update scan status to running
      await updateScanStatusServer(scan.id, 'running')

      let suggestions = []
      let modelName = selectedModel.name
      let modelId = selectedModel.id
      let aiFallbackUsed = false

      if (useAgentWorkflow) {
        try {
          const agentResult = await runAgentWorkflow({
            prompt,
            target,
            userId: user.id,
            userPlan
          })
          suggestions = parseAIResponse(agentResult.response)
          modelName = `Agent Workflow (${agentResult.model})`
          modelId = agentResult.model
          console.log('Agent Response:', agentResult.response)
        } catch (agentError) {
          console.error('Agent workflow failed, falling back to MCP router:', agentError)
          aiFallbackUsed = true
        }
      }

      if (suggestions.length === 0) {
        // Get AI recommendation via MCP router
        const aiResponse = await mcpRouter.executePrompt(
          prompt,
          selectedModel.id,
          systemPrompt
        )
        console.log('AI Response:', aiResponse.response)
        suggestions = parseAIResponse(aiResponse.response)
        modelName = selectedModel.name
        modelId = selectedModel.id
        aiFallbackUsed = aiFallbackUsed || useAgentWorkflow
      }

      if (suggestions.length === 0) {
        throw new Error('No valid tool suggestions from AI')
      }

      const suggestion = suggestions[0] // Use first suggestion

      // Generate command based on AI suggestion
      const plan = buildScanPlan(prompt, target, suggestion.tool)
      const primaryCommand = routeToolCommand(
        suggestion.tool,
        suggestion.target,
        suggestion.flags
      )

      // Update scan with AI recommendation
      await updateScanStatusServer(scan.id, 'running', {
        ai_model_used: modelId,
        ai_reasoning: suggestion.reasoning,
        tool_suggested: suggestion.tool,
        command_generated: JSON.stringify(primaryCommand),
        risk_assessment: suggestion.risk_assessment,
        estimated_time: suggestion.estimated_time,
        plan: plan,
        ai_fallback: aiFallbackUsed || undefined
      }, {
        tool_used: suggestion.tool,
        command_executed: JSON.stringify(primaryCommand)
      })

      // Execute multi-step plan in background (don't await)
      executePlanAsync(scan.id, plan, user.id, target)

      return NextResponse.json({
        success: true,
        scanId: scan.id,
        model: modelName,
        suggestion: {
          tool: suggestion.tool,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence,
          estimatedTime: suggestion.estimated_time,
          riskLevel: suggestion.risk_assessment
        },
        command: primaryCommand,
        plan
      })

    } catch (aiError) {
      console.error('AI processing failed:', aiError)

      // Fallback to basic tool selection
      const fallbackTool = selectFallbackTool(prompt)
      const plan = buildScanPlan(prompt, target, fallbackTool)

      await updateScanStatusServer(scan.id, 'running', {
        ai_fallback: true,
        tool_suggested: fallbackTool,
        command_generated: JSON.stringify(plan.steps.map(step => step.tool)),
        plan
      }, {
        tool_used: fallbackTool,
        command_executed: JSON.stringify(plan.steps.map(step => step.tool))
      })

      // Execute fallback plan
      executePlanAsync(scan.id, plan, user.id, target)

      return NextResponse.json({
        success: true,
        scanId: scan.id,
        model: 'fallback',
        suggestion: {
          tool: fallbackTool,
          reasoning: 'AI fallback - basic tool selection',
          confidence: 0.5,
          estimatedTime: 300,
          riskLevel: 'medium'
        },
        command: plan.steps.map(step => step.tool),
        plan
      })
    }

  } catch (error) {
    console.error('Scan API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Background command execution
async function executeCommandAsync(scanId: string, command: string, timeoutSeconds: number | undefined, userId: string) {
  try {
    const result = await dockerManager.executeCommand(
      command,
      scanId,
      (output) => {
        // In production, this would send real-time updates via WebSocket
        console.log(`Scan ${scanId} output:`, output)
      },
      typeof timeoutSeconds === 'number' ? timeoutSeconds * 1000 : undefined,
      userId
    )

    if (result.success) {
      await updateScanStatusServer(scanId, 'completed', {
        execution_result: result,
        output_length: result.output.length,
        execution_duration: result.duration
      })
    } else {
      await updateScanStatusServer(scanId, 'failed', {
        execution_error: result.error,
        execution_duration: result.duration
      })
    }

  } catch (error) {
    console.error(`Command execution failed for scan ${scanId}:`, error)
    await updateScanStatusServer(scanId, 'failed', {
      execution_error: error instanceof Error ? error.message : String(error)
    })
  }
}

async function executePlanAsync(
  scanId: string,
  plan: { steps: Array<{ tool: string; flags?: string[]; label: string }> },
  userId: string,
  target: string
) {
  try {
    for (let index = 0; index < plan.steps.length; index += 1) {
      const step = plan.steps[index]
      const stepIndex = index + 1
      const command = routeToolCommand(step.tool, target, step.flags)
      const shellCommand = commandToToolString(command)

      await updateScanStatusServer(scanId, 'running', {
        current_step: stepIndex,
        total_steps: plan.steps.length,
        step_label: step.label,
        step_tool: step.tool
      })

      const result = await dockerManager.executeCommand(
        shellCommand,
        scanId,
        (output) => {
          console.log(`Scan ${scanId} output:`, output)
        },
        typeof command.timeout === 'number' ? command.timeout * 1000 : undefined,
        userId
      )

      if (!result.success) {
        await updateScanStatusServer(scanId, 'failed', {
          execution_error: result.error,
          execution_duration: result.duration,
          failed_step: stepIndex
        })
        return
      }
    }

    await updateScanStatusServer(scanId, 'completed', {
      execution_result: 'multi-step',
      execution_duration: 'multi-step'
    })
  } catch (error) {
    console.error(`Command execution failed for scan ${scanId}:`, error)
    await updateScanStatusServer(scanId, 'failed', {
      execution_error: error instanceof Error ? error.message : String(error)
    })
  }
}

// Simple fallback tool selection
function selectFallbackTool(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('wordpress') || lowerPrompt.includes('wp')) {
    return 'wpscan'
  }
  if (lowerPrompt.includes('sql') || lowerPrompt.includes('injection')) {
    return 'sqlmap'
  }
  if (lowerPrompt.includes('directory') || lowerPrompt.includes('file')) {
    return 'gobuster'
  }
  if (lowerPrompt.includes('web') || lowerPrompt.includes('http')) {
    return 'nikto'
  }
  return 'nmap' // Default to network scan
}
