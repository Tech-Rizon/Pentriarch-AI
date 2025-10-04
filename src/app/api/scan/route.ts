import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, insertScan, updateScanStatus } from '@/lib/supabase'
import { mcpRouter, selectOptimalModel } from '@/lib/mcpRouter'
import { routeToolCommand, parseAIResponse } from '@/lib/toolsRouter'
import { dockerManager } from '@/lib/dockerManager'

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    // Parse request body
    const { prompt, target, preferredModel, userPlan = 'free' } = await request.json()

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

    // Validate prompt length and content
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    // Validate preferredModel and userPlan
    const allowedModels = ['gpt-4', 'gpt-4-mini', 'claude-3-sonnet', 'claude-3-haiku', 'deepseek-v2'];
    if (preferredModel && !allowedModels.includes(preferredModel)) {
      return NextResponse.json({ error: 'Invalid model selection' }, { status: 400 });
    }
    const allowedPlans = ['free', 'pro', 'enterprise'];
    if (userPlan && !allowedPlans.includes(userPlan)) {
      return NextResponse.json({ error: 'Invalid user plan' }, { status: 400 });
    }

    // Select optimal AI model based on prompt complexity
    const selectedModel = selectOptimalModel(prompt, preferredModel, userPlan)

    console.log(`Selected model: ${selectedModel.name} for prompt complexity`)

    // Create scan record
    const scan = await insertScan({
      user_id: user.id,
      target,
      prompt,
      status: 'queued',
      ai_model: selectedModel.id,
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
      await updateScanStatus(scan.id, 'running')

      // Get AI recommendation
      const aiResponse = await mcpRouter.executePrompt(
        prompt,
        selectedModel.id,
        systemPrompt
      )

      console.log('AI Response:', aiResponse.response)

      // Parse AI response to extract tool recommendation
      const suggestions = parseAIResponse(aiResponse.response)

      if (suggestions.length === 0) {
        throw new Error('No valid tool suggestions from AI')
      }

      const suggestion = suggestions[0] // Use first suggestion

      // Generate command based on AI suggestion
      const command = routeToolCommand(
        suggestion.tool,
        suggestion.target,
        suggestion.flags
      )

      // Update scan with AI recommendation
      await updateScanStatus(scan.id, 'running', {
        ai_model_used: selectedModel.id,
        ai_reasoning: suggestion.reasoning,
        tool_suggested: suggestion.tool,
        command_generated: JSON.stringify(command),
        risk_assessment: suggestion.risk_assessment,
        estimated_time: suggestion.estimated_time
      })

      // Execute command in background (don't await)
      executeCommandAsync(scan.id, command)

      return NextResponse.json({
        success: true,
        scanId: scan.id,
        model: selectedModel.name,
        suggestion: {
          tool: suggestion.tool,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence,
          estimatedTime: suggestion.estimated_time,
          riskLevel: suggestion.risk_assessment
        },
        command: command
      })

    } catch (aiError) {
      console.error('AI processing failed:', aiError)

      // Fallback to basic tool selection
      const fallbackTool = selectFallbackTool(prompt)
      const fallbackCommand = routeToolCommand(fallbackTool, target)

      await updateScanStatus(scan.id, 'running', {
        ai_fallback: true,
        tool_suggested: fallbackTool,
        command_generated: JSON.stringify(fallbackCommand)
      })

      // Execute fallback command
      executeCommandAsync(scan.id, fallbackCommand)

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
        command: fallbackCommand
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
async function executeCommandAsync(scanId: string, command: string | { toString(): string }) {
  try {
    const result = await dockerManager.executeCommand(
      command,
      scanId,
      (output) => {
        // In production, this would send real-time updates via WebSocket
        console.log(`Scan ${scanId} output:`, output)
      }
    )

    if (result.success) {
      await updateScanStatus(scanId, 'completed', {
        execution_result: result,
        output_length: result.output.length,
        execution_duration: result.duration
      })
    } else {
      await updateScanStatus(scanId, 'failed', {
        execution_error: result.error,
        execution_duration: result.duration
      })
    }

  } catch (error) {
    console.error(`Command execution failed for scan ${scanId}:`, error)
    await updateScanStatus(scanId, 'failed', {
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
