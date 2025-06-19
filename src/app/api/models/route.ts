import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'deepseek' | 'google' | 'mistral'
  type: 'chat' | 'completion' | 'embedding'
  version: string
  context_length: number
  max_tokens: number
  cost_per_token: number
  speed_score: number
  quality_score: number
  reasoning_score: number
  coding_score: number
  available: boolean
  popular: boolean
  recommended: boolean
  description: string
  strengths: string[]
  limitations: string[]
  use_cases: string[]
}

// Mock AI models data - in production, this would come from a database
const mockModels: AIModel[] = [
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    type: 'chat',
    version: '20241022',
    context_length: 200000,
    max_tokens: 8192,
    cost_per_token: 0.00003,
    speed_score: 85,
    quality_score: 95,
    reasoning_score: 98,
    coding_score: 92,
    available: true,
    popular: true,
    recommended: true,
    description: 'Most capable model for complex reasoning and coding tasks',
    strengths: ['Advanced reasoning', 'Code generation', 'Long context', 'Safety'],
    limitations: ['Higher cost', 'Slower than smaller models'],
    use_cases: ['Security analysis', 'Code review', 'Complex reasoning', 'Report generation']
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4 Omni',
    provider: 'openai',
    type: 'chat',
    version: '2024-08-06',
    context_length: 128000,
    max_tokens: 16384,
    cost_per_token: 0.000025,
    speed_score: 80,
    quality_score: 90,
    reasoning_score: 88,
    coding_score: 85,
    available: true,
    popular: true,
    recommended: true,
    description: 'Balanced performance with multimodal capabilities',
    strengths: ['Multimodal', 'Fast response', 'Good general performance'],
    limitations: ['Less reasoning than Claude', 'Context length limitations'],
    use_cases: ['General scanning', 'Quick analysis', 'Multimodal tasks']
  },
  {
    id: 'deepseek-coder-v2',
    name: 'DeepSeek Coder V2',
    provider: 'deepseek',
    type: 'chat',
    version: '0628',
    context_length: 163840,
    max_tokens: 8192,
    cost_per_token: 0.000002,
    speed_score: 90,
    quality_score: 82,
    reasoning_score: 78,
    coding_score: 95,
    available: true,
    popular: false,
    recommended: false,
    description: 'Specialized coding model with exceptional performance',
    strengths: ['Code generation', 'Low cost', 'Fast response', 'Long context'],
    limitations: ['Less general knowledge', 'Newer model'],
    use_cases: ['Code analysis', 'Script generation', 'Technical documentation']
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4 Omni Mini',
    provider: 'openai',
    type: 'chat',
    version: '2024-07-18',
    context_length: 128000,
    max_tokens: 16384,
    cost_per_token: 0.0000015,
    speed_score: 95,
    quality_score: 75,
    reasoning_score: 70,
    coding_score: 78,
    available: true,
    popular: true,
    recommended: false,
    description: 'Fast and cost-effective model for simple tasks',
    strengths: ['Very fast', 'Low cost', 'Good for simple tasks'],
    limitations: ['Lower quality', 'Less reasoning capability'],
    use_cases: ['Simple scans', 'Quick checks', 'Batch processing']
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    type: 'chat',
    version: '001',
    context_length: 2000000,
    max_tokens: 8192,
    cost_per_token: 0.0000125,
    speed_score: 75,
    quality_score: 88,
    reasoning_score: 85,
    coding_score: 80,
    available: true,
    popular: false,
    recommended: false,
    description: 'Extremely long context model for large-scale analysis',
    strengths: ['Massive context', 'Good reasoning', 'Multimodal'],
    limitations: ['Slower response', 'Less coding ability'],
    use_cases: ['Large file analysis', 'Document review', 'Comprehensive scans']
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    type: 'chat',
    version: '2407',
    context_length: 131072,
    max_tokens: 8192,
    cost_per_token: 0.000008,
    speed_score: 88,
    quality_score: 85,
    reasoning_score: 82,
    coding_score: 83,
    available: true,
    popular: false,
    recommended: false,
    description: 'European AI model with strong performance',
    strengths: ['Good balance', 'European provider', 'Privacy focused'],
    limitations: ['Less popular', 'Smaller ecosystem'],
    use_cases: ['European compliance', 'Privacy-sensitive tasks']
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const available = searchParams.get('available')
    const popular = searchParams.get('popular')
    const recommended = searchParams.get('recommended')

    let filteredModels = mockModels

    // Apply filters
    if (provider && provider !== 'all') {
      filteredModels = filteredModels.filter(model => model.provider === provider)
    }

    if (available === 'true') {
      filteredModels = filteredModels.filter(model => model.available)
    }

    if (popular === 'true') {
      filteredModels = filteredModels.filter(model => model.popular)
    }

    if (recommended === 'true') {
      filteredModels = filteredModels.filter(model => model.recommended)
    }

    return NextResponse.json({
      success: true,
      models: filteredModels,
      total: filteredModels.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to fetch models:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json()

    if (!model || !model.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid model data' },
        { status: 400 }
      )
    }

    // In production, this would save to database
    console.log('Adding new model:', model)

    return NextResponse.json({
      success: true,
      message: 'Model added successfully',
      model,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to add model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add model' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Model ID required' },
        { status: 400 }
      )
    }

    // In production, this would update in database
    console.log('Updating model:', id, updates)

    return NextResponse.json({
      success: true,
      message: 'Model updated successfully',
      id,
      updates,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to update model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update model' },
      { status: 500 }
    )
  }
}
