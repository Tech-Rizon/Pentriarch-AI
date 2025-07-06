import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase'
import {
  SECURITY_TOOLS,
  getAllTools,
  getToolsByCategory,
  getToolsByRiskLevel,
  getToolInfo,
  type SecurityTool
} from '@/lib/toolsRouter'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const riskLevel = searchParams.get('risk_level')
    const searchQuery = searchParams.get('search')
<<<<<<< HEAD
    const userPlan = user.raw_user_meta_data?.plan || 'free'
=======
    const userPlan = (user as any)?.raw_user_meta_data?.plan || 'free'
>>>>>>> 640bda3 (Update v1.7.0)

    let tools: SecurityTool[] = getAllTools()

    // Filter by category
    if (category) {
      tools = getToolsByCategory(category as SecurityTool['category'])
    }

    // Filter by risk level
    if (riskLevel) {
      tools = getToolsByRiskLevel(riskLevel as SecurityTool['risk_level'])
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      tools = tools.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
      )
    }

    // Filter by user plan permissions
    const accessibleTools = tools.filter(tool => {
      if (tool.risk_level === 'critical' && userPlan !== 'enterprise') {
        return false
      }
      if (tool.requires_auth && userPlan === 'free') {
        return false
      }
      return true
    })

    // Add usage statistics
    const toolsWithStats = await Promise.all(
      accessibleTools.map(async (tool) => {
        const stats = await getToolUsageStats(tool.id, user.id)
        return {
          ...tool,
          usage_stats: stats,
          user_access: getUserAccessLevel(tool, userPlan)
        }
      })
    )

    // Get categories and counts
    const categories = [...new Set(tools.map(t => t.category))]
    const categoryStats = categories.map(cat => ({
      category: cat,
      total: tools.filter(t => t.category === cat).length,
      accessible: accessibleTools.filter(t => t.category === cat).length
    }))

    return NextResponse.json({
      tools: toolsWithStats,
      total: tools.length,
      accessible: accessibleTools.length,
      categories: categoryStats,
      userPlan,
      filters: {
        category: category || null,
        riskLevel: riskLevel || null,
        search: searchQuery || null
      }
    })

  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve tools',
<<<<<<< HEAD
      details: error.message
=======
      details: error instanceof Error ? error.message : "Unknown error"
>>>>>>> 640bda3 (Update v1.7.0)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only enterprise users can add custom tools
<<<<<<< HEAD
    const userPlan = user.raw_user_meta_data?.plan || 'free'
=======
    const userPlan = (user as any)?.raw_user_meta_data?.plan || 'free'
>>>>>>> 640bda3 (Update v1.7.0)
    if (userPlan !== 'enterprise') {
      return NextResponse.json({
        error: 'Custom tool configuration requires Enterprise plan'
      }, { status: 403 })
    }

    const {
      id,
      name,
      description,
      category,
      risk_level,
      default_flags,
      max_execution_time,
      output_format,
      documentation
    } = await request.json()

    if (!id || !name || !description || !category) {
      return NextResponse.json({
        error: 'ID, name, description, and category are required'
      }, { status: 400 })
    }

    // Check if tool ID already exists
    if (getToolInfo(id)) {
      return NextResponse.json({
        error: 'Tool ID already exists'
      }, { status: 409 })
    }

    // Create custom tool configuration
    const customTool: SecurityTool = {
      id,
      name,
      description,
      category,
      risk_level: risk_level || 'medium',
      requires_auth: false,
      default_flags: default_flags || [],
      max_execution_time: max_execution_time || 300,
      output_format: output_format || 'text',
      documentation: documentation || `Custom tool: ${name}`
    }

    // Save to user settings (in production, this would be in a custom_tools table)
    const { supabase } = await import('@/lib/supabase')

    // Get existing custom tools
    const { data: settings } = await supabase
      .from('user_settings')
      .select('branding')
      .eq('user_id', user.id)
      .single()

    const existingCustomTools = settings?.branding?.custom_tools || []
    const updatedCustomTools = [...existingCustomTools, customTool]

    // Update user settings
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        branding: {
          ...settings?.branding,
          custom_tools: updatedCustomTools
        }
      }, { onConflict: 'user_id' })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      tool: customTool,
      message: 'Custom tool added successfully'
    })

  } catch (error) {
    console.error('Tools POST error:', error)
    return NextResponse.json({
      error: 'Failed to add custom tool',
<<<<<<< HEAD
      details: error.message
=======
      details: error instanceof Error ? error.message : "Unknown error"
>>>>>>> 640bda3 (Update v1.7.0)
    }, { status: 500 })
  }
}

// Get specific tool information
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { toolId, action, configuration } = await request.json()

    if (!toolId || !action) {
      return NextResponse.json({
        error: 'Tool ID and action are required'
      }, { status: 400 })
    }

    const tool = getToolInfo(toolId)
    if (!tool) {
      return NextResponse.json({
        error: 'Tool not found'
      }, { status: 404 })
    }

    switch (action) {
      case 'get_details': {
        const stats = await getToolUsageStats(toolId, user.id)
        return NextResponse.json({
          tool,
          usage_stats: stats,
<<<<<<< HEAD
          user_access: getUserAccessLevel(tool, user.raw_user_meta_data?.plan || 'free'),
=======
          user_access: getUserAccessLevel(tool, (user as any)?.raw_user_meta_data?.plan || 'free'),
>>>>>>> 640bda3 (Update v1.7.0)
          sample_commands: generateSampleCommands(tool)
        })
      }

      case 'update_config': {
        // Update tool configuration for user (enterprise only)
<<<<<<< HEAD
        const userPlan = user.raw_user_meta_data?.plan || 'free'
=======
        const userPlan = (user as any)?.raw_user_meta_data?.plan || 'free'
>>>>>>> 640bda3 (Update v1.7.0)
        if (userPlan !== 'enterprise') {
          return NextResponse.json({
            error: 'Tool configuration requires Enterprise plan'
          }, { status: 403 })
        }

        // Save configuration to user settings
        const { supabase } = await import('@/lib/supabase')
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            branding: {
              tool_configs: {
                [toolId]: configuration
              }
            }
          }, { onConflict: 'user_id' })

        if (error) {
          throw error
        }

        return NextResponse.json({
          success: true,
          message: 'Tool configuration updated'
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: get_details, update_config'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Tools PATCH error:', error)
    return NextResponse.json({
      error: 'Failed to update tool',
<<<<<<< HEAD
      details: error.message
=======
      details: error instanceof Error ? error.message : "Unknown error"
>>>>>>> 640bda3 (Update v1.7.0)
    }, { status: 500 })
  }
}

// Helper functions
async function getToolUsageStats(toolId: string, userId: string) {
  try {
    const { supabase } = await import('@/lib/supabase')

    // Get usage statistics for the tool
    const { data: scans } = await supabase
      .from('scans')
      .select('status, created_at, end_time, start_time')
      .eq('user_id', userId)
      .eq('tool_used', toolId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!scans || scans.length === 0) {
      return {
        total_uses: 0,
        success_rate: 0,
        average_duration: 0,
        last_used: null,
        recent_trend: 'no_data'
      }
    }

    const total = scans.length
    const successful = scans.filter(s => s.status === 'completed').length
    const successRate = Math.round((successful / total) * 100)

    // Calculate average duration
    const completedScans = scans.filter(s => s.start_time && s.end_time)
    const avgDuration = completedScans.length > 0
      ? Math.round(
          completedScans.reduce((acc, scan) => {
            const duration = new Date(scan.end_time).getTime() - new Date(scan.start_time).getTime()
            return acc + duration
          }, 0) / completedScans.length / 1000
        )
      : 0

    // Determine trend (simplified)
    const recentScans = scans.slice(0, 10)
    const olderScans = scans.slice(10, 20)
    const recentSuccess = recentScans.filter(s => s.status === 'completed').length
    const olderSuccess = olderScans.filter(s => s.status === 'completed').length

    let trend = 'stable'
    if (recentSuccess > olderSuccess) trend = 'improving'
    if (recentSuccess < olderSuccess) trend = 'declining'

    return {
      total_uses: total,
      success_rate: successRate,
      average_duration: avgDuration,
      last_used: scans[0].created_at,
      recent_trend: trend
    }

  } catch (error) {
    console.error('Error getting tool usage stats:', error)
    return {
      total_uses: 0,
      success_rate: 0,
      average_duration: 0,
      last_used: null,
      recent_trend: 'error'
    }
  }
}

function getUserAccessLevel(tool: SecurityTool, userPlan: string) {
  if (tool.risk_level === 'critical' && userPlan !== 'enterprise') {
    return {
      access: 'denied',
      reason: 'Critical risk tools require Enterprise plan',
      upgrade_required: true
    }
  }

  if (tool.requires_auth && userPlan === 'free') {
    return {
      access: 'limited',
      reason: 'API key required for this tool',
      upgrade_required: false
    }
  }

  return {
    access: 'full',
    reason: 'Full access available',
    upgrade_required: false
  }
}

function generateSampleCommands(tool: SecurityTool) {
<<<<<<< HEAD
  const samples = {
=======
  const samples: Record<string, string[]> = {
>>>>>>> 640bda3 (Update v1.7.0)
    nmap: [
      'nmap -sV example.com',
      'nmap -sS -O 192.168.1.1',
      'nmap -p 80,443 --script vuln example.com'
    ],
    nikto: [
      'nikto -h https://example.com',
      'nikto -h example.com -port 8080',
      'nikto -h example.com -Tuning 1,2,3'
    ],
    sqlmap: [
      'sqlmap -u "http://example.com/page.php?id=1" --batch',
      'sqlmap -u "http://example.com/login.php" --data="user=admin&pass=admin"',
      'sqlmap -r request.txt --batch --level=5'
    ]
  }

<<<<<<< HEAD
  return samples[tool.id] || [`${tool.id} [target]`]
=======
  return samples[tool.id as keyof typeof samples] || [`${tool.id} [target]`]
>>>>>>> 640bda3 (Update v1.7.0)
}
