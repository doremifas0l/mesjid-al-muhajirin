import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const categoryId = url.searchParams.get("categoryId")
  const admin = getSupabaseAdmin()
  let query = admin.from("finance_transactions").select("*").order("occured_at", { ascending: false })
  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as {
    occured_at: string
    amount: number
    type: "income" | "expense"
    category_id?: string | null
    note?: string | null
  }
  if (!body?.occured_at || !body?.amount || !body?.type) {
    return NextResponse.json({ error: "Missing occured_at, amount or type" }, { status: 400 })
  }
  const { data, error } = await admin.from("finance_transactions").insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as {
    id: string
    occured_at?: string
    amount?: number
    type?: "income" | "expense"
    category_id?: string | null
    note?: string | null
  }
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { data, error } = await admin.from("finance_transactions").update(body).eq("id", body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("finance_transactions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
