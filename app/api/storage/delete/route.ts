import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "site-assets"

export async function POST(req: Request) {
  try {
    const { path } = (await req.json()) as { path?: string }
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 })
  }
}
