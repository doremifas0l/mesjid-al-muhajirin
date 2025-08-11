import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// This GET function already exists and is correct.
export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("note_categories")
    .select("id, name")
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}


// --- NEW ---
// Add this POST function to the same file to handle category creation.
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as { name?: string }
  const name = body?.name?.trim()

  if (!name) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("note_categories")
    .insert({ name })
    .select("id, name")
    .single()

  // Handle potential errors, like if the category name already exists (due to UNIQUE constraint)
  if (error) {
    if (error.code === '23505') { // Code for unique violation
      return NextResponse.json({ error: `Kategori "${name}" sudah ada.` }, { status: 409 }) // 409 Conflict
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
