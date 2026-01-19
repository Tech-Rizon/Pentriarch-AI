export type PlannedStep = {
  tool: string
  label: string
  flags?: string[]
}

export type ScanPlan = {
  strategy: string
  steps: PlannedStep[]
}

const isWebTarget = (target: string) => {
  const lower = target.toLowerCase()
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.includes('.')
}

export const buildScanPlan = (prompt: string, target: string, preferredTool?: string): ScanPlan => {
  const lowerPrompt = prompt.toLowerCase()
  const steps: PlannedStep[] = []
  const webTarget = isWebTarget(target)

  const addStep = (tool: string, label: string, flags?: string[]) => {
    if (!steps.some((step) => step.tool === tool)) {
      steps.push({ tool, label, flags })
    }
  }

  if (webTarget) {
    addStep('whatweb', 'Fingerprint technologies')
  }

  if (lowerPrompt.includes('wordpress') || lowerPrompt.includes('wp')) {
    addStep('wpscan', 'WordPress enumeration')
  } else if (lowerPrompt.includes('sql') || lowerPrompt.includes('injection')) {
    addStep('nikto', 'Baseline web vulnerability check')
    addStep('sqlmap', 'SQL injection testing')
  } else if (lowerPrompt.includes('directory') || lowerPrompt.includes('content') || lowerPrompt.includes('file')) {
    addStep('gobuster', 'Content discovery')
  } else if (lowerPrompt.includes('web') || lowerPrompt.includes('http')) {
    addStep('nikto', 'Web vulnerability scan')
    addStep('gobuster', 'Content discovery')
  } else if (lowerPrompt.includes('port') || lowerPrompt.includes('network')) {
    addStep('nmap', 'Port and service discovery')
  }

  if (steps.length === 0) {
    addStep(webTarget ? 'whatweb' : 'nmap', 'Initial reconnaissance')
  }

  if (preferredTool) {
    addStep(preferredTool, 'AI-selected focus check')
  }

  return {
    strategy: webTarget ? 'web' : 'network',
    steps
  }
}
