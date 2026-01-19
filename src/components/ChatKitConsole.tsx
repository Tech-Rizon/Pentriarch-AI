"use client"

import { useChatKit, ChatKit } from "@openai/chatkit-react"
import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAccessTokenClient } from "@/lib/supabase"

export default function ChatKitConsole() {
  const enabled = process.env.NEXT_PUBLIC_CHATKIT_ENABLED === "true"
  const [isReady, setIsReady] = useState(false)
  const [isScriptReady, setIsScriptReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [entitlementPlan, setEntitlementPlan] = useState<string>("")
  const [allowedScanTypes, setAllowedScanTypes] = useState<string[]>([])
  const [targets, setTargets] = useState<Array<{ id: string; base_url: string; host: string }>>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string>("")
  const [targetsError, setTargetsError] = useState<string | null>(null)
  const [targetsReloadKey, setTargetsReloadKey] = useState(0)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    let isCancelled = false
    const markReady = () => {
      if (!isCancelled) setIsScriptReady(true)
    }

    if (customElements?.get("openai-chatkit")) {
      markReady()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-chatkit]")
    if (!existingScript) {
      const script = document.createElement("script")
      script.src = "https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
      script.async = true
      script.dataset.chatkit = "true"
      script.onload = () => {
        customElements?.whenDefined("openai-chatkit").then(markReady)
      }
      script.onerror = () => {
        if (!isCancelled) {
          setErrorMessage("Failed to load ChatKit UI script.")
        }
      }
      document.head.appendChild(script)
    } else {
      customElements?.whenDefined("openai-chatkit").then(markReady)
    }

    return () => {
      isCancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let isCancelled = false

    const loadEntitlement = async () => {
      const accessToken = await getAccessTokenClient()
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      const res = await fetch("/api/entitlements", { headers })
      if (!res.ok) return
      const data = await res.json()
      if (isCancelled) return
      setEntitlementPlan(data?.entitlement?.plan || "")
      setAllowedScanTypes(data?.entitlement?.allowedScanTypes || [])
    }

    loadEntitlement().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let isCancelled = false

    const loadTargets = async () => {
      const accessToken = await getAccessTokenClient()
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      const res = await fetch("/api/targets", { headers })
      if (!res.ok) {
        if (!isCancelled) setTargetsError("Failed to load targets.")
        return
      }
      const data = await res.json()
      if (isCancelled) return
      const list = Array.isArray(data?.targets) ? data.targets : []
      setTargets(list)
      if (!selectedTargetId && list[0]?.id) {
        setSelectedTargetId(list[0].id)
      }
    }

    loadTargets().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [enabled, targetsReloadKey])

  const planLabel = entitlementPlan ? `${entitlementPlan.toUpperCase()} Plan` : "Plan"
  const scanTypeOptions = allowedScanTypes.map((scanType) => {
    switch (scanType) {
      case "headers_tls":
        return { id: scanType, label: "TLS & Headers Check", icon: "check-circle" as const }
      case "passive_web":
        return { id: scanType, label: "Passive Web Fingerprint", icon: "sparkle" as const }
      default:
        return { id: scanType, label: scanType, icon: "lab" as const }
    }
  })

  const { control } = useChatKit({
    api: {
      async getClientSecret(existing) {
        if (existing) {
          return existing
        }

        const accessToken = await getAccessTokenClient()
        if (!accessToken) {
          throw new Error("You are not signed in. Please log in again.")
        }

        const res = await fetch("/api/chatkit/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          credentials: "same-origin",
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
    theme: {
      colorScheme: "dark",
      radius: "round",
      density: "normal",
      color: {
        accent: { primary: "#10b981", level: 2 },
        surface: { background: "#2e3350", foreground: "#d7e2f0" },
        grayscale: { hue: 255, tint: 7, shade: 1 }
      }
    },
    header: {
      enabled: true,
      title: {
        enabled: true,
        text: `Pentriarch AI Console · ${planLabel}`
      }
    },
    startScreen: {
      greeting: "What would you like to test today?",
      prompts: [
        { label: "Scan a domain for common issues", prompt: "Scan pentriarch.com for common vulnerabilities." },
        { label: "Check for SQL injection", prompt: "Check pentriarch.com for SQL injection vulnerabilities." },
        { label: "Enumerate directories", prompt: "Perform directory enumeration on pentriarch.com." }
      ]
    },
    composer: {
      placeholder: "Describe the target and objective (e.g., scan for SQL injection)",
      tools: scanTypeOptions
    },
    disclaimer: {
      text: "Only test systems you own or have explicit permission to test.",
      highContrast: true
    },
    onClientTool: async (toolCall) => {
      const accessToken = await getAccessTokenClient()
      if (!accessToken) {
        return { error: "You are not signed in. Please log in again." }
      }

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }

      if (toolCall.name === "start_scan") {
        const resolvedTargetId = toolCall.params?.targetId || selectedTargetId
        if (!resolvedTargetId) {
          return { error: "No target selected. Add a target in Assets and select it before scanning." }
        }

        const payload = {
          prompt: toolCall.params?.prompt,
          target: toolCall.params?.target,
          targetId: resolvedTargetId,
          scanType: toolCall.params?.scanType,
          userPlan: toolCall.params?.userPlan || "free",
          authorizationConfirmed: toolCall.params?.authorizationConfirmed === true
        }

        const res = await fetch("/api/scan", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => ({}))
          return { error: "Failed to start scan", details: errorPayload }
        }

        return await res.json()
      }

      if (toolCall.name === "get_scan_status") {
        const scanId = toolCall.params?.scanId
        if (!scanId) {
          return { error: "Missing scanId for status check." }
        }

        const res = await fetch(`/api/status/${scanId}`, {
          method: "GET",
          headers: authHeaders
        })

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => ({}))
          return { error: "Failed to fetch scan status", details: errorPayload }
        }

        return await res.json()
      }

      return { error: `Unknown client tool: ${toolCall.name}` }
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
    if (!isScriptReady) return "Loading ChatKit UI..."
    if (!isReady) return "Starting ChatKit session..."
    return ""
  }, [enabled, errorMessage, isReady, isScriptReady])

  if (!enabled) {
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
    <Card className="bg-slate-800/50 border-slate-700 p-4">
      {(errorMessage || !isReady || !isScriptReady) && (
        <Alert className="mb-4 border-emerald-500/50 bg-emerald-500/10">
          <AlertDescription className="text-emerald-200">
            {statusMessage}
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-60 flex-1">
          <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
              <SelectValue placeholder="Select a target" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {targets.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  {target.host}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="border-slate-600 text-slate-200"
          onClick={() => setTargetsReloadKey((value) => value + 1)}
        >
          Refresh Targets
        </Button>
      </div>
      {targetsError && (
        <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
          <AlertDescription className="text-yellow-200">
            {targetsError}
          </AlertDescription>
        </Alert>
      )}
      <div className="relative h-175 w-full rounded-lg border border-emerald-500/30 bg-slate-900/70">
        <ChatKit control={control} className="h-full w-full" />
      </div>
    </Card>
  )
}
