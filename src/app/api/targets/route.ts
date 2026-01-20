import { NextResponse } from "next/server"
import { createTargetServer, ensureDefaultProjectServer, getCurrentUserServer, listTargetsForOwnerServer } from "@/lib/supabase"
import { getEntitlementForUser } from "@/lib/policy/entitlementMiddleware"

export const dynamic = 'force-dynamic'

const normalizeBaseUrl = (input: string) => {
  const trimmed = input.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  return {
    baseUrl: url.origin,
    host: url.hostname.toLowerCase()
  }
}

export const runtime = "nodejs"

export async function GET() {
  const user = await getCurrentUserServer()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const targets = await listTargetsForOwnerServer(user.id)
  return NextResponse.json({ targets })
}

export async function POST(request: Request) {
  const user = await getCurrentUserServer()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  if (!body?.baseUrl || typeof body.baseUrl !== "string") {
    return NextResponse.json({ error: "baseUrl is required" }, { status: 400 })
  }

  const { baseUrl, host } = normalizeBaseUrl(body.baseUrl)
  const project = await ensureDefaultProjectServer(user.id)
  const entitlement = await getEntitlementForUser(user.id)

  const scope = body.scope && typeof body.scope === "object" ? body.scope : undefined

  const target = await createTargetServer(project.id, {
    base_url: baseUrl,
    host,
    verified: entitlement.active_scans_allowed,
    active_scans_allowed: entitlement.active_scans_allowed,
    scope: scope || null
  })

  return NextResponse.json({ target })
}
