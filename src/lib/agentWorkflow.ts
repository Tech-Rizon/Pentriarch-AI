import { Agent, Runner, withTrace, type AgentInputItem } from '@openai/agents'

type WorkflowInput = {
  prompt: string
  target: string
  userId: string
  userPlan?: 'free' | 'pro' | 'enterprise'
}

type WorkflowResult = {
  response: string
  model: string
}

const agentModel = process.env.AGENT_MODEL || 'gpt-4.1'

const scanPlanner = new Agent({
  name: 'Pentriarch Scan Planner',
  instructions: [
    'You are a professional penetration testing assistant.',
    'Pick the safest and most appropriate single tool for the user request.',
    'Available tools: nmap, nikto, sqlmap, wpscan, gobuster, whatweb, masscan.',
    'Only suggest sqlmap if there is a clear indication of SQL injection testing.',
    'Return ONLY a single JSON object with keys:',
    'tool, target, reasoning, confidence, flags, estimated_time, risk_assessment.',
    'confidence must be 0-1. estimated_time is seconds. risk_assessment is low|medium|high|critical.'
  ].join(' '),
  model: agentModel,
  modelSettings: {
    temperature: 0.2,
    topP: 1,
    maxTokens: 1200,
    store: true
  }
})

export const runAgentWorkflow = async (workflow: WorkflowInput): Promise<WorkflowResult> => {
  return await withTrace('pentriarch-scan-workflow', async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              `User request: ${workflow.prompt}`,
              `Target: ${workflow.target}`,
              `User plan: ${workflow.userPlan || 'free'}`
            ].join('\n')
          }
        ]
      }
    ]

    const traceMetadata: Record<string, string> = {
      __trace_source__: 'pentriarch'
    }

    const workflowId = process.env.AGENT_WORKFLOW_ID || process.env.CHATKIT_WORKFLOW_ID
    if (workflowId) {
      traceMetadata.workflow_id = workflowId
    }
    traceMetadata.user_id = workflow.userId

    const runner = new Runner({ traceMetadata })
    const result = await runner.run(scanPlanner, conversationHistory)

    if (!result.finalOutput) {
      throw new Error('Agent result is undefined')
    }

    return {
      response: result.finalOutput,
      model: agentModel
    }
  })
}
