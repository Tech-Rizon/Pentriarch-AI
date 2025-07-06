// Advanced AI Analysis Engine for Intelligent Vulnerability Analysis
// Multi-step reasoning, risk assessment, and automated remediation

import { Scan, type Finding, Report } from './supabase'

// AI Analysis Types
interface VulnerabilityContext {
  target: string
  scanType: string
  environment: 'production' | 'staging' | 'development' | 'unknown'
  businessCritical: boolean
  exposureLevel: 'internet' | 'internal' | 'isolated'
}

interface RiskFactors {
  severity: number
  exploitability: number
  businessImpact: number
  dataExposure: number
  compliance: number
  patchAvailability: number
}

interface RemediationStep {
  priority: 'immediate' | 'high' | 'medium' | 'low'
  action: string
  description: string
  estimatedTime: string
  riskReduction: number
  dependencies?: string[]
}

interface AIAnalysisResult {
  riskScore: number
  confidenceLevel: number
  threatLevel: 'critical' | 'high' | 'medium' | 'low'
  reasoning: string[]
  correlatedFindings: Finding[]
  remediationPlan: RemediationStep[]
  predictiveInsights: string[]
  complianceImpact: string[]
}

export class AIAnalysisEngine {
  private readonly AI_MODELS = {
    reasoning: 'gpt-4',
    risk_assessment: 'claude-3-sonnet',
    remediation: 'deepseek-coder',
    prediction: 'gpt-4-mini'
  }

  /**
   * Advanced multi-step vulnerability analysis with reasoning
   */
  async analyzeVulnerabilities(
    findings: Finding[],
    scanContext: VulnerabilityContext,
    scanLogs: string[]
  ): Promise<AIAnalysisResult> {
    try {
      // Step 1: Context Analysis
      const contextAnalysis = await this.analyzeContext(scanContext, scanLogs)

      // Step 2: Multi-step Reasoning
      const reasoningChain = await this.performMultiStepReasoning(findings, contextAnalysis)

      // Step 3: Risk Assessment
      const riskAssessment = await this.calculateAdvancedRiskScore(findings, scanContext, reasoningChain)

      // Step 4: Finding Correlation
      const correlatedFindings = await this.correlateFindingsWithAI(findings, reasoningChain)

      // Step 5: Intelligent Remediation
      const remediationPlan = await this.generateIntelligentRemediation(findings, riskAssessment, scanContext)

      // Step 6: Predictive Analysis
      const predictiveInsights = await this.generatePredictiveInsights(findings, scanContext, scanLogs)

      // Step 7: Compliance Impact
      const complianceImpact = await this.assessComplianceImpact(findings, scanContext)

      return {
        riskScore: riskAssessment.totalScore,
        confidenceLevel: reasoningChain.confidence,
        threatLevel: this.calculateThreatLevel(riskAssessment.totalScore),
        reasoning: reasoningChain.steps,
        correlatedFindings,
        remediationPlan,
        predictiveInsights,
        complianceImpact
      }
    } catch (error) {
      console.error('AI Analysis Engine error:', error)
      if (error instanceof Error) {
        throw new Error(`AI analysis failed: ${error.message}`)
      } else {
        throw new Error('AI analysis failed: Unknown error')
      }

    }
  }

  /**
   * Multi-step reasoning engine for complex vulnerability analysis
   */
  private async performMultiStepReasoning(
    findings: Finding[],
    contextAnalysis: {
      target_type: string
      service_fingerprint: string[]
      attack_surface: string
      business_context: boolean
    }
  ): Promise<{ steps: string[], confidence: number }> {
    const reasoningPrompt = `
    As a senior penetration testing expert, perform multi-step reasoning analysis:

    FINDINGS:
    ${findings.map(f => `- ${f.title}: ${f.description} [${f.severity}]`).join('\n')}

    CONTEXT: ${JSON.stringify(contextAnalysis)}

    Perform step-by-step analysis:
    1. Attack Vector Analysis: How could these vulnerabilities be chained?
    2. Business Impact Assessment: What are the potential business consequences?
    3. Environmental Factors: How does the environment affect exploitability?
    4. Threat Actor Perspective: What would an attacker target first?
    5. Defense Evasion: What security controls could be bypassed?

    Provide reasoning steps and confidence level (0-100).
    `

    try {
      const response = await this.callAIModel(this.AI_MODELS.reasoning, reasoningPrompt)
      return this.parseReasoningResponse(response)
    } catch (error) {
      return {
        steps: ['Basic analysis performed due to AI service unavailability'],
        confidence: 60
      }
    }
  }

  /**
   * Advanced risk scoring with contextual factors
   */
  private async calculateAdvancedRiskScore(
    findings: Finding[],
    context: VulnerabilityContext,
    reasoning: { steps: string[], confidence: number }
  ): Promise<{ totalScore: number, factors: RiskFactors }> {
    const riskPrompt = `
    Calculate advanced risk score considering:

    VULNERABILITIES: ${JSON.stringify(findings.map(f => ({
      title: f.title,
      severity: f.severity,
      cve: f.cve_refs
    })))}

    CONTEXT: Business Critical: ${context.businessCritical}, Environment: ${context.environment}, Exposure: ${context.exposureLevel}

    REASONING: ${reasoning.steps.join(' ')}

    Provide risk factors (0-100 each):
    - Severity: Base vulnerability severity
    - Exploitability: Ease of exploitation
    - Business Impact: Potential business damage
    - Data Exposure: Risk of data breach
    - Compliance: Regulatory impact
    - Patch Availability: How quickly can this be fixed

    Return JSON with risk factors and total weighted score.
    `

    try {
      const response = await this.callAIModel(this.AI_MODELS.risk_assessment, riskPrompt)
      return this.parseRiskResponse(response)
    } catch (error) {
      return this.calculateFallbackRiskScore(findings, context)
    }
  }

  /**
   * AI-powered finding correlation to identify attack chains
   */
  private async correlateFindingsWithAI(
    findings: Finding[],
    reasoning: { steps: string[], confidence: number }
  ): Promise<Finding[]> {
    if (findings.length < 2) return findings

    const correlationPrompt = `
    Analyze vulnerability correlations for attack chain identification:

    FINDINGS: ${JSON.stringify(findings)}
    REASONING: ${reasoning.steps.join(' ')}

    Identify:
    1. Which vulnerabilities can be chained together?
    2. What would be the most effective attack path?
    3. Which findings amplify others' impact?
    4. Are there logical groupings by system/service?

    Return findings in order of attack chain priority.
    `

    try {
      const response = await this.callAIModel(this.AI_MODELS.reasoning, correlationPrompt)
      return this.parseCorrelationResponse(response, findings)
    } catch (error) {
      return this.performBasicCorrelation(findings)
    }
  }

  /**
   * Intelligent remediation plan generation
   */
  private async generateIntelligentRemediation(
    findings: Finding[],
    riskAssessment: { totalScore: number, factors: RiskFactors },
    context: VulnerabilityContext
  ): Promise<RemediationStep[]> {
    const remediationPrompt = `
    Generate intelligent remediation plan for:

    VULNERABILITIES: ${JSON.stringify(findings)}
    RISK SCORE: ${riskAssessment.totalScore}
    CONTEXT: ${JSON.stringify(context)}

    For each vulnerability, provide:
    1. Priority level (immediate/high/medium/low)
    2. Specific action steps
    3. Estimated time to fix
    4. Risk reduction percentage
    5. Dependencies between fixes

    Consider:
    - Business continuity during fixes
    - Resource requirements
    - Optimal fix sequencing
    - Temporary mitigations

    Return structured remediation plan.
    `

    try {
      const response = await this.callAIModel(this.AI_MODELS.remediation, remediationPrompt)
      return this.parseRemediationResponse(response)
    } catch (error) {
      return this.generateBasicRemediation(findings)
    }
  }

  /**
   * Predictive vulnerability discovery using ML patterns
   */
  private async generatePredictiveInsights(
    findings: Finding[],
    context: VulnerabilityContext,
    scanLogs: string[]
  ): Promise<string[]> {
    const predictionPrompt = `
    Based on current findings, predict additional vulnerabilities:

    CURRENT FINDINGS: ${JSON.stringify(findings)}
    SCAN LOGS: ${scanLogs.slice(-10).join('\n')}
    TARGET: ${context.target}

    Predict:
    1. Likely additional vulnerabilities based on patterns
    2. Services that should be investigated further
    3. Configuration issues that commonly co-occur
    4. Missing security controls based on what was found
    5. Recommended additional scans/tools

    Provide actionable predictions.
    `

    try {
      const response = await this.callAIModel(this.AI_MODELS.prediction, predictionPrompt)
      return this.parsePredictionResponse(response)
    } catch (error) {
      return this.generateBasicPredictions(findings, context)
    }
  }

  /**
   * Compliance impact assessment
   */
  private async assessComplianceImpact(
    findings: Finding[],
    context: VulnerabilityContext
  ): Promise<string[]> {
    const compliancePrompt = `
    Assess compliance impact for findings:

    VULNERABILITIES: ${JSON.stringify(findings)}
    BUSINESS CRITICAL: ${context.businessCritical}
    ENVIRONMENT: ${context.environment}

    Analyze impact on:
    - PCI DSS
    - SOX
    - GDPR/CCPA
    - ISO 27001
    - NIST Framework
    - Industry-specific regulations

    Provide specific compliance violations and requirements.
    `

    try {
      const response = await this.callAIModel(this.AI_MODELS.risk_assessment, compliancePrompt)
      return this.parseComplianceResponse(response)
    } catch (error) {
      return this.generateBasicComplianceAssessment(findings)
    }
  }

  // Helper methods for parsing AI responses
  private parseReasoningResponse(response: string): { steps: string[], confidence: number } {
    try {
      const parsed = JSON.parse(response)
      return {
        steps: parsed.reasoning_steps || [],
        confidence: parsed.confidence || 75
      }
    } catch {
      const steps = response.split('\n').filter(line => line.includes('.')).slice(0, 5)
      return { steps, confidence: 70 }
    }
  }

  private parseRiskResponse(response: string): { totalScore: number, factors: RiskFactors } {
    try {
      const parsed = JSON.parse(response)
      return {
        totalScore: parsed.total_score || 50,
        factors: parsed.risk_factors || this.getDefaultRiskFactors()
      }
    } catch {
      return {
        totalScore: 50,
        factors: this.getDefaultRiskFactors()
      }
    }
  }

  private parseCorrelationResponse(response: string, originalFindings: Finding[]): Finding[] {
    try {
      const parsed = JSON.parse(response)
      if (parsed.prioritized_findings) {
        return parsed.prioritized_findings
      }
    } catch {
      // Fallback to basic correlation
    }
    return this.performBasicCorrelation(originalFindings)
  }

  private parseRemediationResponse(response: string): RemediationStep[] {
    try {
      const parsed = JSON.parse(response)
      return parsed.remediation_steps || this.getDefaultRemediationSteps()
    } catch {
      return this.getDefaultRemediationSteps()
    }
  }

  private parsePredictionResponse(response: string): string[] {
    try {
      const parsed = JSON.parse(response)
      return parsed.predictions || []
    } catch {
      return response.split('\n').filter(line => line.trim().length > 0).slice(0, 5)
    }
  }

  private parseComplianceResponse(response: string): string[] {
    try {
      const parsed = JSON.parse(response)
      return parsed.compliance_impacts || []
    } catch {
      return response.split('\n').filter(line => line.includes('compliance') || line.includes('regulation')).slice(0, 3)
    }
  }

  // Fallback methods when AI is unavailable
  private calculateFallbackRiskScore(findings: Finding[], context: VulnerabilityContext): { totalScore: number, factors: RiskFactors } {
    const severityScore = this.calculateSeverityScore(findings)
    const contextScore = context.businessCritical ? 20 : 10
    const exposureScore = context.exposureLevel === 'internet' ? 30 : context.exposureLevel === 'internal' ? 15 : 5

    return {
      totalScore: Math.min(100, severityScore + contextScore + exposureScore),
      factors: this.getDefaultRiskFactors()
    }
  }

  private performBasicCorrelation(findings: Finding[]): Finding[] {
    return findings.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  private generateBasicRemediation(findings: Finding[]): RemediationStep[] {
    return findings.map(finding => ({
      priority: finding.severity === 'critical' ? 'immediate' :
                finding.severity === 'high' ? 'high' :
                finding.severity === 'medium' ? 'medium' : 'low',
      action: `Address ${finding.title}`,
      description: finding.recommendation || 'Follow security best practices',
      estimatedTime: finding.severity === 'critical' ? '24 hours' : '1-2 weeks',
      riskReduction: finding.severity === 'critical' ? 40 :
                     finding.severity === 'high' ? 25 : 15
    }))
  }

  private generateBasicPredictions(findings: Finding[], context: VulnerabilityContext): string[] {
    const predictions = []

    if (findings.some(f => f.title.includes('SQL'))) {
      predictions.push('Additional database vulnerabilities likely present')
    }
    if (findings.some(f => f.title.includes('XSS'))) {
      predictions.push('Input validation issues may exist elsewhere')
    }
    if (context.exposureLevel === 'internet') {
      predictions.push('Consider comprehensive external attack surface assessment')
    }

    return predictions
  }

  private generateBasicComplianceAssessment(findings: Finding[]): string[] {
    const impacts = []

    if (findings.some(f => f.severity === 'critical')) {
      impacts.push('Critical vulnerabilities may violate PCI DSS requirements')
    }
    if (findings.some(f => f.title.includes('SSL') || f.title.includes('TLS'))) {
      impacts.push('Encryption issues impact GDPR and data protection compliance')
    }

    return impacts
  }

  // Utility methods
  private calculateThreatLevel(riskScore: number): 'critical' | 'high' | 'medium' | 'low' {
    if (riskScore >= 80) return 'critical'
    if (riskScore >= 60) return 'high'
    if (riskScore >= 40) return 'medium'
    return 'low'
  }

  private calculateSeverityScore(findings: Finding[]): number {
    const weights = { 'critical': 40, 'high': 25, 'medium': 10, 'low': 5 }
    return findings.reduce((score, finding) => score + (weights[finding.severity] || 0), 0)
  }

  private getDefaultRiskFactors(): RiskFactors {
    return {
      severity: 50,
      exploitability: 40,
      businessImpact: 30,
      dataExposure: 35,
      compliance: 25,
      patchAvailability: 60
    }
  }

  private getDefaultRemediationSteps(): RemediationStep[] {
    return [{
      priority: 'high',
      action: 'Review and address identified vulnerabilities',
      description: 'Implement security patches and configuration changes',
      estimatedTime: '1-2 weeks',
      riskReduction: 70
    }]
  }

  private async analyzeContext(context: VulnerabilityContext, logs: string[]) {
    return {
      target_type: this.inferTargetType(context.target),
      service_fingerprint: this.extractServices(logs),
      attack_surface: context.exposureLevel,
      business_context: context.businessCritical
    }
  }

  private inferTargetType(target: string): string {
    if (target.includes('.com') || target.includes('.org')) return 'web_application'
    if (target.match(/^\d+\.\d+\.\d+\.\d+$/)) return 'ip_address'
    return 'unknown'
  }

  private extractServices(logs: string[]): string[] {
    const services = []
    for (const log of logs) {
      if (log.includes('http')) services.push('HTTP')
      if (log.includes('ssl') || log.includes('https')) services.push('HTTPS')
      if (log.includes('ssh')) services.push('SSH')
      if (log.includes('ftp')) services.push('FTP')
    }
    return [...new Set(services)]
  }

  private async callAIModel(model: string, prompt: string): Promise<string> {
    // This would integrate with the existing MCP router
    const { mcpRouter } = await import('./mcpRouter')
    return await mcpRouter.getAnalysis(prompt, model)
  }
}

// Export singleton instance
export const aiAnalysisEngine = new AIAnalysisEngine()
