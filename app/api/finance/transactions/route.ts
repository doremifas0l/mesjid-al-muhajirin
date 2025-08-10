import { NextResponse } from "next/server"
// Ensure you are importing your SERVER-SIDE admin client
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// GET handler: Fetches transactions, can be filtered by category NAME
export async function GET(req: Request) {
  const url = new URL(req.url)
  // MODIFIED: We now filter by 'category' which is a string, not 'categoryId'
  const category = url.searchParams.get("category")
  const admin = getSupabaseAdmin()

  let query = admin
    .from("finance_transactions")
    .select("*")
    .order("occured_at", { ascending: false })

  // MODIFIED: The filter now uses the text 'category' column
  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  if (error) {
    console.error("Finance GET Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// POST handler: Creates a new transaction using the category NAME
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  // MODIFIED: The body now expects a 'category' string
  const body = (await req.json()) as {
    occured_at: string
    amount: number
    type: "income" | "expense"
    category?: string | null // Changed from category_id
    note?: string | null
  }

  if (!body?.occured_at || !body?.amount || !body?.type) {
    return NextResponse.json({ error: "Missing occured_at, amount or type" }, { status: 400 })
  }

  // Set a default category if none is provided
  const transactionData = {
    ...body,
    category: body.category || "Keuangan Masjid",
  }

  const { data, error } = await admin
    .from("finance_transactions")
    .insert(transactionData)
    .select()
    .single()

  if (error) {
    console.error("Finance POST Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// PUT handler: Updates a transaction using the category NAME
export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  // MODIFIED: The body now expects a 'category' string
  const body = (await req.json()) as {
    id: string
    occured_at?: string
    amount?: number
    type?: "income" | "expense"
    category?: string | null // Changed from category_id
    note?: string | null
  }

  if (!body?.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("finance_transactions")
    .update(body)
    .eq("id", body.id)
    .select()
    .single()

  if (error) {
    console.error("Finance PUT Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE handler: No changes needed, it works correctly by ID
export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const { error } = await admin.from("finance_transactions").delete().eq("id", id)

  if (error) {
    console.error("Finance DELETE Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
