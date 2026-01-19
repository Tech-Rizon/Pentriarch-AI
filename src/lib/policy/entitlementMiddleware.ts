import { getProjectByIdServer, getTargetByIdServer } from "@/lib/supabase"
import { getSupabaseServerClient } from "@/lib/supabase"

export type Entitlement = {
  plan: "free" | "pro" | "enterprise"
  allowedScanTypes: string[]
  active_scans_allowed: boolean
}

const PLAN_SCAN_TYPES: Record<Entitlement["plan"], string[]> = {
  free: ["headers_tls"],
  pro: ["headers_tls", "passive_web"],
  enterprise: ["headers_tls", "passive_web"]
}

export const getEntitlementForUser = async (userId: string): Promise<Entitlement> => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from("user_profiles")
    .select("plan")
    .eq("id", userId)
    .single()

  if (error) {
    throw error
  }

  const plan = (data?.plan || "free") as Entitlement["plan"]
  return {
    plan,
    allowedScanTypes: PLAN_SCAN_TYPES[plan],
    active_scans_allowed: plan !== "free"
  }
}

export const requireEntitlement = async ({
  userId,
  targetId,
  scanType
}: {
  userId: string
  targetId: string
  scanType: string
}) => {
  const entitlement = await getEntitlementForUser(userId)

  if (!entitlement.allowedScanTypes.includes(scanType)) {
    return {
      ok: false,
      reason: "Scan type not allowed for current plan.",
      entitlement
    }
  }

  const target = await getTargetByIdServer(targetId)
  const project = await getProjectByIdServer(target.project_id)
  if (project.owner_id !== userId) {
    return {
      ok: false,
      reason: "Target is not owned by this account.",
      entitlement
    }
  }

  if (!target.active_scans_allowed) {
    return {
      ok: false,
      reason: "Target is not enabled for active scans.",
      entitlement
    }
  }

  return {
    ok: true,
    entitlement,
    target
  }
}
