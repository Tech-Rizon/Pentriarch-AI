import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserServer } from "@/lib/supabase"

const CHATKIT_ENDPOINT = "https://api.openai.com/v1/chatkit/sessions"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserServer(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workflowId = process.env.CHATKIT_WORKFLOW_ID
    const apiKey = process.env.OPENAI_API_KEY

    if (!workflowId || !apiKey) {
      return NextResponse.json(
        { error: "Missing ChatKit configuration. Set CHATKIT_WORKFLOW_ID and OPENAI_API_KEY." },
        { status: 500 }
      )
    }

    const payload = {
      workflow: { id: workflowId },
      user: user.id,
    }

    const response = await fetch(CHATKIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: "Failed to create ChatKit session", details: errorPayload },
        { status: response.status }
      )
    }

    const data = await response.json()
    if (!data?.client_secret) {
      return NextResponse.json(
        { error: "ChatKit response missing client secret" },
        { status: 502 }
      )
    }

    return NextResponse.json({ client_secret: data.client_secret })
  } catch (error) {
    console.error("ChatKit session error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
