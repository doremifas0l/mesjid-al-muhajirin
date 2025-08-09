import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("notes").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as { title: string; content: string }
  if (!body?.content) return NextResponse.json({ error: "Missing content" }, { status: 400 })
  const title = body.title?.trim() || "Catatan"
  const { data, error } = await admin.from("notes").insert({ title, content: body.content }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as { id: string; title?: string; content?: string }
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { data, error } = await admin
    .from("notes")
    .update({ title: body.title, content: body.content })
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
  const { error } = await admin.from("notes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
