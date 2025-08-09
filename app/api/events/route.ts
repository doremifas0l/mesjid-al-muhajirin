import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("events").select("*").order("starts_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as {
    title: string
    starts_at: string
    location?: string
    description?: string
    image_url?: string
    image_path?: string
  }
  if (!body?.title || !body?.starts_at) {
    return NextResponse.json({ error: "Missing title or starts_at" }, { status: 400 })
  }
  const { data, error } = await admin.from("events").insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as {
    id: string
    title?: string
    starts_at?: string
    location?: string
    description?: string
    image_url?: string
    image_path?: string
  }
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { data, error } = await admin.from("events").update(body).eq("id", body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("events").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
