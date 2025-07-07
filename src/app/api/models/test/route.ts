import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/lib/auth-helpers'

interface ModelTest {
  id: string
  model_id: string
  prompt: string
  response: string
  response_time: number
  token_count: number
  cost: number
  score: number
  created_at: string
  error?: string
}

interface TestRequest {
  prompt: string
  models: string[]
  evaluation_criteria?: string[]
}

// Mock model costs per token
const modelCosts: Record<string, number> = {
  'claude-3.5-sonnet': 0.00003,
  'gpt-4o': 0.000025,
  'deepseek-coder-v2': 0.000002,
  'gpt-4o-mini': 0.0000015,
  'gemini-1.5-pro': 0.0000125,
  'mistral-large': 0.000008
}

// Mock AI responses for testing (in production, these would call actual AI APIs)
const mockResponses: Record<string, (prompt: string) => Promise<{ response: string; tokens: number }>> = {
  'claude-3.5-sonnet': async (prompt: string) => ({
    response: `Claude 3.5 Sonnet response to: "${prompt}"\n\nThis is a detailed, well-reasoned response that demonstrates advanced reasoning capabilities. The model provides comprehensive analysis with careful consideration of multiple perspectives and potential implications. It maintains high accuracy while being helpful and safe.`,
    tokens: 75
  }),
  'gpt-4o': async (prompt: string) => ({
    response: `GPT-4 Omni response to: "${prompt}"\n\nThis response shows strong general capabilities with good reasoning and clear communication. The model provides helpful information while maintaining a balanced perspective. It demonstrates reliable performance across various tasks.`,
    tokens: 58
  }),
  'deepseek-coder-v2': async (prompt: string) => ({
    response: `DeepSeek Coder V2 response to: "${prompt}"\n\nThis response demonstrates strong coding capabilities with technical precision. The model excels at code generation, analysis, and technical documentation. It provides efficient solutions with detailed explanations.`,
    tokens: 52
  }),
  'gpt-4o-mini': async (prompt: string) => ({
    response: `GPT-4 Omni Mini response to: "${prompt}"\n\nThis is a concise, efficient response that covers the key points. The model provides helpful information quickly and cost-effectively, making it suitable for straightforward tasks.`,
    tokens: 35
  }),
  'gemini-1.5-pro': async (prompt: string) => ({
    response: `Gemini 1.5 Pro response to: "${prompt}"\n\nThis response demonstrates strong analytical capabilities with the ability to process large amounts of context. The model provides thorough analysis with attention to detail and comprehensive coverage.`,
    tokens: 68
  }),
  'mistral-large': async (prompt: string) => ({
    response: `Mistral Large response to: "${prompt}"\n\nThis response shows balanced performance with good reasoning abilities. The model provides reliable results with a focus on efficiency and practical solutions. It demonstrates consistent quality across various tasks.`,
    tokens: 48
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('model_id')
    const limit = Number.parseInt(searchParams.get('limit') || '20')

    // In production, this would fetch from database
    // For now, return mock test data
    const mockTests: ModelTest[] = [
      {
        id: 'test-1',
        model_id: 'claude-3.5-sonnet',
        prompt: 'Analyze this network configuration for security vulnerabilities',
        response: 'After analyzing the network configuration, I found several potential security vulnerabilities...',
        response_time: 2400,
        token_count: 185,
        cost: 0.00555,
        score: 92,
        created_at: '2024-06-18T14:30:00Z'
      },
      {
        id: 'test-2',
        model_id: 'gpt-4o',
        prompt: 'Analyze this network configuration for security vulnerabilities',
        response: 'Based on the network configuration provided, here are the key security concerns...',
        response_time: 1800,
        token_count: 142,
        cost: 0.00355,
        score: 87,
        created_at: '2024-06-18T14:25:00Z'
      },
      {
        id: 'test-3',
        model_id: 'deepseek-coder-v2',
        prompt: 'Generate a Python script for port scanning',
        response: 'Here\'s a comprehensive Python script for port scanning with error handling...',
        response_time: 1200,
        token_count: 168,
        cost: 0.000336,
        score: 95,
        created_at: '2024-06-18T13:45:00Z'
      }
    ]

    let filteredTests = mockTests

    if (modelId) {
      filteredTests = filteredTests.filter(test => test.model_id === modelId)
    }

    filteredTests = filteredTests.slice(0, limit)

    return NextResponse.json({
      success: true,
      tests: filteredTests,
      total: filteredTests.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to fetch test results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test results' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, models, evaluation_criteria }: TestRequest = await request.json()

    if (!prompt || !models || models.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt and models are required' },
        { status: 400 }
      )
    }

    if (models.length > 6) {
      return NextResponse.json(
        { success: false, error: 'Maximum 6 models can be tested at once' },
        { status: 400 }
      )
    }

    const testResults: ModelTest[] = []

    // Test each model
    for (const modelId of models) {
      try {
        const startTime = Date.now()

        // Get mock response (in production, this would call actual AI API)
        const mockResponse = mockResponses[modelId]
        if (!mockResponse) {
          throw new Error(`Model ${modelId} not available for testing`)
        }

        const { response, tokens } = await mockResponse(prompt)
        const responseTime = Date.now() - startTime + Math.random() * 1000 // Add some realistic variance

        // Calculate cost
        const costPerToken = modelCosts[modelId] || 0.00001
        const cost = tokens * costPerToken

        // Calculate a mock score based on response quality indicators
        let score = 70 + Math.random() * 25 // Base score 70-95

        // Adjust score based on model characteristics
        if (modelId === 'claude-3.5-sonnet') score = Math.min(95, score + 10)
        if (modelId === 'gpt-4o') score = Math.min(90, score + 5)
        if (modelId === 'deepseek-coder-v2' && prompt.toLowerCase().includes('code')) {
          score = Math.min(98, score + 15)
        }

        const testResult: ModelTest = {
          id: `test-${Date.now()}-${modelId}`,
          model_id: modelId,
          prompt,
          response,
          response_time: Math.round(responseTime),
          token_count: tokens,
          cost: Math.round(cost * 100000) / 100000, // Round to 5 decimal places
          score: Math.round(score),
          created_at: new Date().toISOString()
        }

        testResults.push(testResult)

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

      } catch (error) {
        console.error(`Failed to test model ${modelId}:`, error)

        testResults.push({
          id: `test-${Date.now()}-${modelId}-error`,
          model_id: modelId,
          prompt,
          response: '',
          response_time: 0,
          token_count: 0,
          cost: 0,
          score: 0,
          created_at: new Date().toISOString(),
          error: getErrorMessage(error)
        })
      }
    }

    // In production, save test results to database
    console.log('Test results:', testResults)

    // Calculate comparison metrics
    const validResults = testResults.filter(r => !r.error)
    const comparison = {
      fastest: validResults.reduce((min, test) =>
        test.response_time < min.response_time ? test : min
      ),
      highest_score: validResults.reduce((max, test) =>
        test.score > max.score ? test : max
      ),
      most_cost_effective: validResults.reduce((min, test) =>
        test.cost < min.cost ? test : min
      ),
      avg_response_time: validResults.reduce((sum, test) => sum + test.response_time, 0) / validResults.length,
      avg_score: validResults.reduce((sum, test) => sum + test.score, 0) / validResults.length,
      total_cost: validResults.reduce((sum, test) => sum + test.cost, 0)
    }

    return NextResponse.json({
      success: true,
      results: testResults,
      comparison,
      prompt,
      models_tested: models.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to run model test:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run model test' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { testIds } = await request.json()

    if (!testIds || !Array.isArray(testIds)) {
      return NextResponse.json(
        { success: false, error: 'Test IDs array required' },
        { status: 400 }
      )
    }

    // In production, this would delete from database
    console.log('Deleting test results:', testIds)

    return NextResponse.json({
      success: true,
      message: 'Test results deleted',
      deleted_count: testIds.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to delete test results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete test results' },
      { status: 500 }
    )
  }
}
