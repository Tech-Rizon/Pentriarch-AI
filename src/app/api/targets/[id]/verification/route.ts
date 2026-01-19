import { NextResponse } from "next/server"
import { createTargetVerificationServer, getCurrentUserServer, getProjectByIdServer, getTargetByIdServer } from "@/lib/supabase"
import { randomUUID } from "node:crypto"

export const runtime = "nodejs"

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

  const token = `pentriarch-verify-${randomUUID()}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const verification = await createTargetVerificationServer({
    target_id: target.id,
    method: "well_known",
    token,
    expires_at: expiresAt
  })

  return NextResponse.json({
    verification,
    instructions: {
      url: `${target.base_url}/.well-known/pentriarch-proof.txt`,
      token
    }
  })
}
