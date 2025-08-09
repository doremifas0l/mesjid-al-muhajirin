import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("homepage_images")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as { path: string; url: string; position?: number }
  if (!body?.path || !body?.url) return NextResponse.json({ error: "Missing path/url" }, { status: 400 })
  const { data, error } = await admin
    .from("homepage_images")
    .insert({ path: body.path, url: body.url, position: body.position ?? 0 })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as { id: string; position?: number }
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { data, error } = await admin
    .from("homepage_images")
    .update({ position: body.position ?? 0 })
    .eq("id", body.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("homepage_images").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
