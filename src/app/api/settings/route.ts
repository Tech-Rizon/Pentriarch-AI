import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { AI_MODELS } from '@/lib/mcpRouter'

// Extended user type
interface ExtendedUser {
  id: string
  email: string
  name?: string
  created_at: string
  role: string
  user_metadata?: {
    full_name?: string
    plan?: 'free' | 'pro' | 'enterprise'
  }
}

function getUserPlan(user: ExtendedUser): 'free' | 'pro' | 'enterprise' {
  return user.user_metadata?.plan || 'free'
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser() as ExtendedUser
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const defaultSettings = {
      preferred_ai_model: 'gpt-4-mini',
      notification_preferences: {
        email: true,
        browser: true,
        scan_complete: true,
        vulnerabilities: true
      },
      api_keys: {},
      branding: {}
    }

    const userSettings = settings || defaultSettings
    const userPlan = getUserPlan(user)

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

    return NextResponse.json({
      settings: userSettings,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        plan: userPlan,
        created_at: user.created_at
      },
      availableModels,
      capabilities: {
        customBranding: userPlan === 'enterprise',
        apiKeyManagement: userPlan !== 'free',
        customTools: userPlan === 'enterprise',
        advancedNotifications: userPlan !== 'free',
        auditExport: userPlan === 'enterprise'
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings GET error:', message)
    return NextResponse.json({ error: 'Failed to retrieve settings', details: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser() as ExtendedUser
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      preferred_ai_model,
      notification_preferences,
      api_keys,
      branding,
      profile_updates
    } = await request.json()

    const userPlan = getUserPlan(user)

    if (preferred_ai_model) {
      const model = AI_MODELS.find(m => m.id === preferred_ai_model)
      if (!model) {
        return NextResponse.json({ error: 'Invalid AI model selected' }, { status: 400 })
      }

      if (userPlan === 'free' && !['gpt-4-mini', 'claude-3-haiku'].includes(preferred_ai_model)) {
        return NextResponse.json({ error: 'Selected model requires Pro or Enterprise plan' }, { status: 403 })
      }

      if (userPlan === 'pro' && preferred_ai_model === 'deepseek-v2') {
        return NextResponse.json({ error: 'DeepSeek V2 requires Enterprise plan' }, { status: 403 })
      }
    }

    if (api_keys && userPlan === 'free') {
      return NextResponse.json({ error: 'API key management requires Pro or Enterprise plan' }, { status: 403 })
    }

    if (branding && userPlan !== 'enterprise') {
      return NextResponse.json({ error: 'Custom branding requires Enterprise plan' }, { status: 403 })
    }

    const settingsUpdate: any = {
      user_id: user.id,
      updated_at: new Date().toISOString()
    }

    if (preferred_ai_model) settingsUpdate.preferred_ai_model = preferred_ai_model
    if (notification_preferences) settingsUpdate.notification_preferences = notification_preferences
    if (api_keys) settingsUpdate.api_keys = api_keys
    if (branding) settingsUpdate.branding = branding

    const { data: updatedSettings, error: settingsError } = await supabase
      .from('user_settings')
      .upsert(settingsUpdate, { onConflict: 'user_id' })
      .select()
      .single()

    if (settingsError) throw settingsError

    if (profile_updates) {
      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          full_name: profile_updates.full_name || user.user_metadata?.full_name
        }
      })
      if (profileError) console.error('Profile update error:', profileError)
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings POST error:', message)
    return NextResponse.json({ error: 'Failed to update settings', details: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser() as ExtendedUser
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, data } = await request.json()
    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 })

    const userPlan = getUserPlan(user)

    switch (action) {
      case 'test_api_key': {
        if (userPlan === 'free') {
          return NextResponse.json({ error: 'API key testing requires Pro or Enterprise plan' }, { status: 403 })
        }
        const { provider, apiKey } = data
        const testResult = await testApiKey(provider, apiKey)
        return NextResponse.json({ success: true, test_result: testResult })
      }
      case 'export_settings': {
        if (userPlan !== 'enterprise') {
          return NextResponse.json({ error: 'Settings export requires Enterprise plan' }, { status: 403 })
        }
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        const exportData = {
          exported_at: new Date().toISOString(),
          user_id: user.id,
          settings: { ...settings, api_keys: undefined }
        }

        return NextResponse.json(exportData, {
          headers: {
            'Content-Disposition': `attachment; filename="pentriarch-settings-${user.id}.json"`,
            'Content-Type': 'application/json'
          }
        })
      }
      case 'reset_settings': {
        const { error } = await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Settings reset to defaults' })
      }
      case 'toggle_feature': {
        const { feature, enabled } = data

        const { data: currentSettings } = await supabase
          .from('user_settings')
          .select('notification_preferences')
          .eq('user_id', user.id)
          .single()

        const updatedPreferences = {
          ...currentSettings?.notification_preferences,
          [feature]: enabled
        }

        const { error: updateError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            notification_preferences: updatedPreferences,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        if (updateError) throw updateError

        return NextResponse.json({ success: true, message: `${feature} ${enabled ? 'enabled' : 'disabled'}` })
      }
      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: test_api_key, export_settings, reset_settings, toggle_feature'
        }, { status: 400 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings PATCH error:', message)
    return NextResponse.json({ error: 'Failed to perform action', details: message }, { status: 500 })
  }
}

async function testApiKey(provider: string, apiKey: string) {
  try {
    switch (provider) {
      case 'openai': {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey })
        const response = await openai.models.list()
        return {
          valid: true,
          provider: 'OpenAI',
          models_available: response.data.length,
          message: 'API key is valid'
        }
      }
      case 'anthropic': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey })
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }]
        })
        return {
          valid: true,
          provider: 'Anthropic',
          message: 'API key is valid',
          test_response: message.content[0]
        }
      }
      case 'deepseek': {
        const DeepSeekAI = (await import('openai')).default
        const deepseek = new DeepSeekAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' })
        const dsResponse = await deepseek.models.list()
        return {
          valid: true,
          provider: 'DeepSeek',
          models_available: dsResponse.data.length,
          message: 'API key is valid'
        }
      }
      default:
        return { valid: false, provider, message: 'Unsupported provider' }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      valid: false,
      provider,
      message,
      error: error instanceof Error ? error.toString() : String(error)

    }
  }
}
