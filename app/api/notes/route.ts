import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

type NotePayload = {
  id?: string
  title?: string
  content?: string
  category_id?: string
  links?: { url: string; label: string }[]
}

// GET function with the fix
export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notes")
    .select(`id, title, content, created_at, links, category_id, note_categories ( name )`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET Notes Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // --- THE FIX ---
  // Instead of spreading the complex `note` object, we create a new, clean object
  // by explicitly picking only the data we need. This removes any hidden functions.
  const reshapedData = data.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    created_at: note.created_at,
    links: note.links,
    category_id: note.category_id,
    // @ts-ignore
    category_name: note.note_categories?.name || null
  }));

  return NextResponse.json({ data: reshapedData })
}

// POST function with the same fix
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as NotePayload
  if (!body?.content) return NextResponse.json({ error: "Missing content" }, { status: 400 })

  const payloadToInsert = {
    title: body.title?.trim() || "Catatan",
    content: body.content.trim(),
    category_id: body.category_id || null,
    links: body.links && body.links.length > 0 ? body.links : null
  }
  
  const { data, error } = await admin
    .from("notes")
    .insert(payloadToInsert)
    .select(`id, title, content, created_at, links, category_id, note_categories ( name )`)
    .single()

  if (error) {
    console.error("POST Note Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // --- THE FIX ---
  // Apply the same sanitization logic to the single returned object.
  const reshapedData = {
    id: data.id,
    title: data.title,
    content: data.content,
    created_at: data.created_at,
    links: data.links,
    category_id: data.category_id,
    // @ts-ignore
    category_name: data.note_categories?.name || null
  };

  return NextResponse.json({ data: reshapedData })
}

// PUT function with the same fix
export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as NotePayload
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const payloadToUpdate: { [key: string]: any } = {}
  if (body.title !== undefined) payloadToUpdate.title = body.title
  if (body.content !== undefined) payloadToUpdate.content = body.content
  if (body.category_id !== undefined) payloadToUpdate.category_id = body.category_id
  if (body.links !== undefined) payloadToUpdate.links = body.links

  const { data, error } = await admin
    .from("notes")
    .update(payloadToUpdate)
    .eq("id", body.id)
    .select(`id, title, content, created_at, links, category_id, note_categories ( name )`)
    .single()

  if (error) {
    console.error("PUT Note Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // --- THE FIX ---
  // Apply the same sanitization logic here as well.
  const reshapedData = {
    id: data.id,
    title: data.title,
    content: data.content,
    created_at: data.created_at,
    links: data.links,
    category_id: data.category_id,
    // @ts-ignore
    category_name: data.note_categories?.name || null
  };

  return NextResponse.json({ data: reshapedData })
}

// DELETE function remains the same
export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("notes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
