import { NextResponse } from "next/server"
import { getCurrentUserServer } from "@/lib/supabase"
import { getEntitlementForUser } from "@/lib/policy/entitlementMiddleware"

export const runtime = "nodejs"

export async function GET() {
  const user = await getCurrentUserServer()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const entitlement = await getEntitlementForUser(user.id)
  return NextResponse.json({ entitlement })
}
