import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer } from '@/lib/supabase'
import { AI_MODELS } from '@/lib/mcpRouter'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'interface UserPreferences {
  primary_model: string
  fallback_model: string
  auto_fallback: boolean
  budget_limit: number
  quality_threshold: number
  speed_preference: 'fast' | 'balanced' | 'quality'
  custom_prompts: Record<string, string>
  model_weights: {
    speed: number
    quality: number
    cost: number
    reliability: number
  }
}

export async function POST(request: NextRequest) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { modelId, temporary = false, preferences } = body

    // Handle new preferences format
    if (preferences) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          preferred_ai_model: preferences.primary_model,
          ai_model_preferences: preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Failed to update user preferences:', error)
        return NextResponse.json({
          error: 'Failed to save model preferences'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        preferences,
        message: 'Model preferences saved successfully'
      })
    }

    // Handle legacy single model selection
    if (!modelId) {
      return NextResponse.json({
        error: 'Model ID or preferences required'
      }, { status: 400 })
    }

    // Validate model exists and user has access
    const model = AI_MODELS.find(m => m.id === modelId)
    if (!model) {
      return NextResponse.json({
        error: `Model '${modelId}' not found`
      }, { status: 400 })
    }

    // Check user plan permissions
    const userPlan = (user as any)?.raw_user_meta_data?.plan || 'free'

    if (userPlan === 'free' && !['gpt-4-mini', 'claude-3-haiku'].includes(modelId)) {
      return NextResponse.json({
        error: 'Selected model requires Pro or Enterprise plan'
      }, { status: 403 })
    }

    if (userPlan === 'pro' && modelId === 'deepseek-v2') {
      return NextResponse.json({
        error: 'DeepSeek V2 requires Enterprise plan'
      }, { status: 403 })
    }

    if (!temporary) {
      // Update permanent user preference
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          preferred_ai_model: modelId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Failed to update user settings:', error)
        return NextResponse.json({
          error: 'Failed to save model preference'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider
      },
      temporary,
      message: temporary
        ? `Temporarily using ${model.name} for this session`
        : `Default model set to ${model.name}`
    })

  } catch (error) {
    console.error('Set model API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
  const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current model preference and preferences
    const { data: settings } = await supabase
      .from('user_settings')
      .select('preferred_ai_model, ai_model_preferences')
      .eq('user_id', user.id)
      .single()

    const userPlan = (user as any)?.raw_user_meta_data?.plan || 'free'
    const preferredModelId = settings?.preferred_ai_model || 'gpt-4-mini'

    // Default preferences if none exist
    const defaultPreferences: UserPreferences = {
      primary_model: preferredModelId,
      fallback_model: 'gpt-4o-mini',
      auto_fallback: true,
      budget_limit: 100,
      quality_threshold: 0.8,
      speed_preference: 'balanced',
      custom_prompts: {},
      model_weights: {
        speed: 25,
        quality: 40,
        cost: 20,
        reliability: 15
      }
    }

    const preferences = settings?.ai_model_preferences || defaultPreferences

    // Filter available models based on user plan
    let availableModels = AI_MODELS.filter(model => model.available)

    if (userPlan === 'free') {
      availableModels = availableModels.filter(model =>
        ['gpt-4-mini', 'claude-3-haiku'].includes(model.id)
      )
    } else if (userPlan === 'pro') {
      availableModels = availableModels.filter(model =>
        model.id !== 'deepseek-v2'
      )
    }

    const currentModel = availableModels.find(m => m.id === preferredModelId)

    return NextResponse.json({
      currentModel: currentModel || availableModels[0],
      availableModels,
      preferences,
      userPlan
    })

  } catch (error) {
    console.error('Get model API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
