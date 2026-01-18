"use client"

import { useChatKit, ChatKit } from "@openai/chatkit-react"
import { useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"

export default function ChatKitConsole() {
  const enabled = process.env.NEXT_PUBLIC_CHATKIT_ENABLED === "true"
  const [isReady, setIsReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { control } = useChatKit({
    api: {
      async getClientSecret(existing) {
        if (existing) {
          return existing
        }

        const res = await fetch("/api/chatkit/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.error || "Failed to create ChatKit session")
        }

        const data = await res.json()
        return data.client_secret as string
      },
    },
    onReady: () => {
      setIsReady(true)
      setErrorMessage(null)
    },
    onError: (event) => {
      setErrorMessage(event.error?.message || "ChatKit failed to initialize.")
      setIsReady(false)
    }
  })

  const statusMessage = useMemo(() => {
    if (!enabled) return "ChatKit is disabled. Set NEXT_PUBLIC_CHATKIT_ENABLED=true."
    if (errorMessage) return errorMessage
    if (!isReady) return "Starting ChatKit session..."
    return ""
  }, [enabled, errorMessage, isReady])

  if (!enabled || errorMessage || !isReady) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 p-6">
        <Alert className="border-emerald-500/50 bg-emerald-500/10">
          <AlertDescription className="text-emerald-200">
            {statusMessage}
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <div className="h-[700px] w-full">
      <ChatKit control={control} className="h-full w-full" />
    </div>
  )
}
