import { type NextRequest, NextResponse } from 'next/server'
<<<<<<< HEAD
import { createClient } from '@/lib/supabase'
=======
import { createClient } from '@supabase/supabase-js'
>>>>>>> 640bda3 (Update v1.7.0)

interface ModelPerformance {
  model_id: string
  response_time: number
  success_rate: number
  total_requests: number
  avg_tokens: number
  cost_total: number
  last_used: string
  error_rate: number
  satisfaction_score: number
}

// Mock performance data - in production, this would come from analytics database
const mockPerformance: ModelPerformance[] = [
  {
    model_id: 'claude-3.5-sonnet',
    response_time: 2400,
    success_rate: 97.8,
    total_requests: 1247,
    avg_tokens: 1850,
    cost_total: 68.45,
    last_used: '2024-06-18T14:30:00Z',
    error_rate: 2.2,
    satisfaction_score: 4.8
  },
  {
    model_id: 'gpt-4o',
    response_time: 1800,
    success_rate: 95.2,
    total_requests: 2156,
    avg_tokens: 1420,
    cost_total: 76.55,
    last_used: '2024-06-18T14:25:00Z',
    error_rate: 4.8,
    satisfaction_score: 4.5
  },
  {
    model_id: 'deepseek-coder-v2',
    response_time: 1200,
    success_rate: 92.1,
    total_requests: 568,
    avg_tokens: 1680,
    cost_total: 1.92,
    last_used: '2024-06-18T13:45:00Z',
    error_rate: 7.9,
    satisfaction_score: 4.2
  },
  {
    model_id: 'gpt-4o-mini',
    response_time: 850,
    success_rate: 89.5,
    total_requests: 3421,
    avg_tokens: 980,
    cost_total: 5.03,
    last_used: '2024-06-18T14:35:00Z',
    error_rate: 10.5,
    satisfaction_score: 3.9
  },
  {
    model_id: 'gemini-1.5-pro',
    response_time: 3200,
    success_rate: 94.7,
    total_requests: 298,
    avg_tokens: 2240,
    cost_total: 8.34,
    last_used: '2024-06-18T12:20:00Z',
    error_rate: 5.3,
    satisfaction_score: 4.3
  },
  {
    model_id: 'mistral-large',
    response_time: 1600,
    success_rate: 91.8,
    total_requests: 145,
    avg_tokens: 1320,
    cost_total: 1.53,
    last_used: '2024-06-18T11:10:00Z',
    error_rate: 8.2,
    satisfaction_score: 4.0
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('model_id')
    const days = Number.parseInt(searchParams.get('days') || '30')
    const metric = searchParams.get('metric')

    let performanceData = mockPerformance

    // Filter by specific model if requested
    if (modelId) {
      performanceData = performanceData.filter(p => p.model_id === modelId)
    }

    // Calculate aggregate metrics
    const totalRequests = performanceData.reduce((sum, p) => sum + p.total_requests, 0)
    const avgResponseTime = performanceData.reduce((sum, p) => sum + p.response_time, 0) / performanceData.length
    const avgSuccessRate = performanceData.reduce((sum, p) => sum + p.success_rate, 0) / performanceData.length
    const totalCost = performanceData.reduce((sum, p) => sum + p.cost_total, 0)

    const aggregates = {
      total_requests: totalRequests,
      avg_response_time: Math.round(avgResponseTime),
      avg_success_rate: Math.round(avgSuccessRate * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      active_models: performanceData.length
    }

    // Generate trend data (mock)
    const trendData = Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))

      return {
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 100) + 20,
        avg_response_time: Math.floor(Math.random() * 1000) + 1000,
        success_rate: Math.random() * 10 + 90,
        cost: Math.random() * 5 + 1
      }
    })

    return NextResponse.json({
      success: true,
      performance: performanceData,
      aggregates,
      trend: trendData,
      period_days: days,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to fetch performance data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      model_id,
      response_time,
      success,
      token_count,
      cost,
      satisfaction_score
    } = await request.json()

    if (!model_id || response_time === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In production, this would save performance data to analytics database
    const performanceEntry = {
      model_id,
      response_time,
      success: success !== undefined ? success : true,
      token_count: token_count || 0,
      cost: cost || 0,
      satisfaction_score: satisfaction_score || null,
      timestamp: new Date().toISOString()
    }

    console.log('Recording performance data:', performanceEntry)

    return NextResponse.json({
      success: true,
      message: 'Performance data recorded',
      data: performanceEntry,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to record performance data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record performance data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('model_id')
    const days = Number.parseInt(searchParams.get('days') || '0')

    if (!modelId && !days) {
      return NextResponse.json(
        { success: false, error: 'Must specify model_id or days to delete' },
        { status: 400 }
      )
    }

    // In production, this would delete performance data from database
    console.log('Deleting performance data:', { modelId, days })

    return NextResponse.json({
      success: true,
      message: 'Performance data deleted',
      deleted: {
        model_id: modelId,
        days_older_than: days
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to delete performance data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete performance data' },
      { status: 500 }
    )
  }
}
