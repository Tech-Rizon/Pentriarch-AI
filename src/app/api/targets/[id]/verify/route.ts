import { NextResponse } from "next/server"
import { getCurrentUserServer, getLatestPendingVerificationServer, getProjectByIdServer, getTargetByIdServer, markTargetVerifiedServer, updateTargetVerificationStatusServer } from "@/lib/supabase"

export const dynamic = 'force-dynamic'
export const runtime = "nodejs"

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUserServer()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const target = await getTargetByIdServer(params.id)
  const project = await getProjectByIdServer(target.project_id)
  if (project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const verification = await getLatestPendingVerificationServer(target.id)
  if (!verification) {
    return NextResponse.json({ error: "No pending verification found" }, { status: 404 })
  }

  if (verification.expires_at && new Date(verification.expires_at).getTime() < Date.now()) {
    await updateTargetVerificationStatusServer(verification.id, "expired")
    return NextResponse.json({ error: "Verification token expired" }, { status: 410 })
  }

  const proofUrl = `${target.base_url}/.well-known/pentriarch-proof.txt`
  const response = await fetchWithTimeout(proofUrl, 5000)
  if (!response.ok) {
    await updateTargetVerificationStatusServer(verification.id, "failed")
    return NextResponse.json({ error: "Verification file not found" }, { status: 404 })
  }

  const bodyText = (await response.text()).trim()
  if (bodyText !== verification.token) {
    await updateTargetVerificationStatusServer(verification.id, "failed")
    return NextResponse.json({ error: "Verification token mismatch" }, { status: 400 })
  }

  await updateTargetVerificationStatusServer(verification.id, "verified", new Date().toISOString())
  const updatedTarget = await markTargetVerifiedServer(target.id)

  return NextResponse.json({ target: updatedTarget, verified: true })
}
