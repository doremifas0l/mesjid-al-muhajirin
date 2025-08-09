import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "site-assets"

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const { path } = (await req.json()) as { path?: string }
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 })

  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
