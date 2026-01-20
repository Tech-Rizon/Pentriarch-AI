import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Note: WebSocket functionality is temporarily disabled in Next.js App Router
// The application will automatically fall back to polling for real-time updates

export async function GET(request: NextRequest) {
  return new Response('WebSocket not supported in this environment. Using polling fallback.', {
    status: 426,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}

// Fallback API for broadcasting messages when WebSocket is not available
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, userId, data } = body

    // This endpoint can be used by backend processes to trigger status updates
    // The frontend polling will pick up changes from the database

    console.log('WebSocket fallback message:', { type, userId, data })

    // For now, just log the message - in production you could:
    // 1. Store in Redis for polling to pick up
    // 2. Use Server-Sent Events
    // 3. Use a proper WebSocket server (Socket.IO, etc.)

    return Response.json({
      success: true,
      message: 'Fallback message logged. Using polling for real-time updates.'
    })

  } catch (error) {
    console.error('WebSocket fallback API error:', error)
    return Response.json(
      { error: 'Failed to process fallback message' },
      { status: 500 }
    )
  }
}
