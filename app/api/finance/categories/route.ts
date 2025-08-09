import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("finance_categories").select("*").order("name", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const { name } = (await req.json()) as { name?: string }
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 })
  const { data, error } = await admin.from("finance_categories").insert({ name }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("finance_categories").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
