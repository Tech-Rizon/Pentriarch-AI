import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { AI_MODELS } from '@/lib/mcpRouter'

<<<<<<< HEAD
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
=======
interface UserWithMetadata {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
    plan?: string;
  };
  raw_user_meta_data?: {
    full_name?: string;
    plan?: string;
    organization?: string;
  };
>>>>>>> 640bda3 (Update v1.7.0)
}

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    const user = await getCurrentUser() as ExtendedUser
=======
    const user = await getCurrentUser() as UserWithMetadata
>>>>>>> 640bda3 (Update v1.7.0)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

<<<<<<< HEAD
=======
    // Get user settings
>>>>>>> 640bda3 (Update v1.7.0)
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

<<<<<<< HEAD
    if (error && error.code !== 'PGRST116') {
      throw error
    }

=======
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // Default settings if none exist
>>>>>>> 640bda3 (Update v1.7.0)
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
<<<<<<< HEAD
    const userPlan = getUserPlan(user)

=======

    // Get user plan and profile info
    const userPlan = user?.raw_user_meta_data?.plan || user?.user_metadata?.plan || 'free'

    // Get available models for user's plan
>>>>>>> 640bda3 (Update v1.7.0)
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
<<<<<<< HEAD
        full_name: user.user_metadata?.full_name || user.email,
=======
        full_name: user.user_metadata?.full_name || user.raw_user_meta_data?.full_name || user.email,
>>>>>>> 640bda3 (Update v1.7.0)
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
<<<<<<< HEAD
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings GET error:', message)
    return NextResponse.json({ error: 'Failed to retrieve settings', details: message }, { status: 500 })
=======

  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve settings',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
>>>>>>> 640bda3 (Update v1.7.0)
  }
}

export async function POST(request: NextRequest) {
  try {
<<<<<<< HEAD
    const user = await getCurrentUser() as ExtendedUser
=======
    const user = await getCurrentUser() as UserWithMetadata
>>>>>>> 640bda3 (Update v1.7.0)
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

<<<<<<< HEAD
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
=======
    const userPlan = user?.raw_user_meta_data?.plan || user?.user_metadata?.plan || 'free'

    // Validate AI model selection
    if (preferred_ai_model) {
      const model = AI_MODELS.find(m => m.id === preferred_ai_model)
      if (!model) {
        return NextResponse.json({
          error: 'Invalid AI model selected'
        }, { status: 400 })
      }

      // Check plan permissions
      if (userPlan === 'free' && !['gpt-4-mini', 'claude-3-haiku'].includes(preferred_ai_model)) {
        return NextResponse.json({
          error: 'Selected model requires Pro or Enterprise plan'
        }, { status: 403 })
      }

      if (userPlan === 'pro' && preferred_ai_model === 'deepseek-v2') {
        return NextResponse.json({
          error: 'DeepSeek V2 requires Enterprise plan'
        }, { status: 403 })
      }
    }

    // Validate API keys (only for paid plans)
    if (api_keys && userPlan === 'free') {
      return NextResponse.json({
        error: 'API key management requires Pro or Enterprise plan'
      }, { status: 403 })
    }

    // Validate branding (only for enterprise)
    if (branding && userPlan !== 'enterprise') {
      return NextResponse.json({
        error: 'Custom branding requires Enterprise plan'
      }, { status: 403 })
    }

    // Prepare settings update
    const settingsUpdate: {
      user_id: string
      updated_at: string
      preferred_ai_model?: string
      notification_preferences?: unknown
      api_keys?: unknown
      branding?: unknown
    } = {
>>>>>>> 640bda3 (Update v1.7.0)
      user_id: user.id,
      updated_at: new Date().toISOString()
    }

<<<<<<< HEAD
    if (preferred_ai_model) settingsUpdate.preferred_ai_model = preferred_ai_model
    if (notification_preferences) settingsUpdate.notification_preferences = notification_preferences
    if (api_keys) settingsUpdate.api_keys = api_keys
    if (branding) settingsUpdate.branding = branding

=======
    if (preferred_ai_model) {
      settingsUpdate.preferred_ai_model = preferred_ai_model
    }

    if (notification_preferences) {
      settingsUpdate.notification_preferences = notification_preferences
    }

    if (api_keys) {
      // Encrypt API keys (in production, use proper encryption)
      settingsUpdate.api_keys = api_keys
    }

    if (branding) {
      settingsUpdate.branding = branding
    }

    // Update settings
>>>>>>> 640bda3 (Update v1.7.0)
    const { data: updatedSettings, error: settingsError } = await supabase
      .from('user_settings')
      .upsert(settingsUpdate, { onConflict: 'user_id' })
      .select()
      .single()

<<<<<<< HEAD
    if (settingsError) throw settingsError

    if (profile_updates) {
      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          full_name: profile_updates.full_name || user.user_metadata?.full_name
        }
      })
      if (profileError) console.error('Profile update error:', profileError)
=======
    if (settingsError) {
      throw settingsError
    }

    // Update profile if requested
    if (profile_updates) {
      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          full_name: profile_updates.full_name || user.user_metadata?.full_name || user.raw_user_meta_data?.full_name
        }
      })

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Don't throw here, settings update was successful
      }
>>>>>>> 640bda3 (Update v1.7.0)
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    })

<<<<<<< HEAD
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings POST error:', message)
    return NextResponse.json({ error: 'Failed to update settings', details: message }, { status: 500 })
=======
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
>>>>>>> 640bda3 (Update v1.7.0)
  }
}

export async function PATCH(request: NextRequest) {
  try {
<<<<<<< HEAD
    const user = await getCurrentUser() as ExtendedUser
=======
    const user = await getCurrentUser() as UserWithMetadata
>>>>>>> 640bda3 (Update v1.7.0)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, data } = await request.json()
<<<<<<< HEAD
    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 })

    const userPlan = getUserPlan(user)
=======

    if (!action) {
      return NextResponse.json({
        error: 'Action is required'
      }, { status: 400 })
    }

    const userPlan = user?.raw_user_meta_data?.plan || user?.user_metadata?.plan || 'free'
>>>>>>> 640bda3 (Update v1.7.0)

    switch (action) {
      case 'test_api_key': {
        if (userPlan === 'free') {
<<<<<<< HEAD
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
=======
          return NextResponse.json({
            error: 'API key testing requires Pro or Enterprise plan'
          }, { status: 403 })
        }

        const { provider, apiKey } = data
        const testResult = await testApiKey(provider, apiKey)

        return NextResponse.json({
          success: true,
          test_result: testResult
        })
      }

      case 'export_settings': {
        if (userPlan !== 'enterprise') {
          return NextResponse.json({
            error: 'Settings export requires Enterprise plan'
          }, { status: 403 })
        }

>>>>>>> 640bda3 (Update v1.7.0)
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        const exportData = {
          exported_at: new Date().toISOString(),
          user_id: user.id,
<<<<<<< HEAD
          settings: { ...settings, api_keys: undefined }
=======
          settings: {
            ...settings,
            api_keys: undefined // Don't export API keys for security
          }
>>>>>>> 640bda3 (Update v1.7.0)
        }

        return NextResponse.json(exportData, {
          headers: {
            'Content-Disposition': `attachment; filename="pentriarch-settings-${user.id}.json"`,
            'Content-Type': 'application/json'
          }
        })
      }
<<<<<<< HEAD
=======

>>>>>>> 640bda3 (Update v1.7.0)
      case 'reset_settings': {
        const { error } = await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', user.id)

<<<<<<< HEAD
        if (error) throw error

        return NextResponse.json({ success: true, message: 'Settings reset to defaults' })
      }
      case 'toggle_feature': {
        const { feature, enabled } = data

=======
        if (error) {
          throw error
        }

        return NextResponse.json({
          success: true,
          message: 'Settings reset to defaults'
        })
      }

      case 'toggle_feature': {
        const { feature, enabled } = data

        // Get current settings
>>>>>>> 640bda3 (Update v1.7.0)
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

<<<<<<< HEAD
        if (updateError) throw updateError

        return NextResponse.json({ success: true, message: `${feature} ${enabled ? 'enabled' : 'disabled'}` })
      }
=======
        if (updateError) {
          throw updateError
        }

        return NextResponse.json({
          success: true,
          message: `${feature} ${enabled ? 'enabled' : 'disabled'}`
        })
      }

>>>>>>> 640bda3 (Update v1.7.0)
      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: test_api_key, export_settings, reset_settings, toggle_feature'
        }, { status: 400 })
    }
<<<<<<< HEAD
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings PATCH error:', message)
    return NextResponse.json({ error: 'Failed to perform action', details: message }, { status: 500 })
  }
}

=======

  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({
      error: 'Failed to perform action',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Helper function to test API keys
>>>>>>> 640bda3 (Update v1.7.0)
async function testApiKey(provider: string, apiKey: string) {
  try {
    switch (provider) {
      case 'openai': {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey })
<<<<<<< HEAD
=======

>>>>>>> 640bda3 (Update v1.7.0)
        const response = await openai.models.list()
        return {
          valid: true,
          provider: 'OpenAI',
          models_available: response.data.length,
          message: 'API key is valid'
        }
      }
<<<<<<< HEAD
      case 'anthropic': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey })
=======

      case 'anthropic': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey })

        // Test with a simple message
>>>>>>> 640bda3 (Update v1.7.0)
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }]
        })
<<<<<<< HEAD
=======

>>>>>>> 640bda3 (Update v1.7.0)
        return {
          valid: true,
          provider: 'Anthropic',
          message: 'API key is valid',
          test_response: message.content[0]
        }
      }
<<<<<<< HEAD
      case 'deepseek': {
        const DeepSeekAI = (await import('openai')).default
        const deepseek = new DeepSeekAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' })
=======

      case 'deepseek': {
        // DeepSeek uses OpenAI-compatible API
        const DeepSeekAI = (await import('openai')).default
        const deepseek = new DeepSeekAI({
          apiKey,
          baseURL: 'https://api.deepseek.com/v1'
        })

>>>>>>> 640bda3 (Update v1.7.0)
        const dsResponse = await deepseek.models.list()
        return {
          valid: true,
          provider: 'DeepSeek',
          models_available: dsResponse.data.length,
          message: 'API key is valid'
        }
      }
<<<<<<< HEAD
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

=======

      default:
        return {
          valid: false,
          provider,
          message: 'Unsupported provider'
        }
    }

  } catch (error) {
    return {
      valid: false,
      provider,
      message: error instanceof Error ? error.message : 'API key test failed',
      error: error instanceof Error ? error.toString() : String(error)
>>>>>>> 640bda3 (Update v1.7.0)
    }
  }
}
