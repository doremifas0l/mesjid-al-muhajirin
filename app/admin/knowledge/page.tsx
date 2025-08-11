import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// --- NEW --- Define the expected shape of the request body for creating/updating notes
type NotePayload = {
  id?: string
  title?: string
  content?: string
  category_id?: string
  links?: { url: string; label: string }[] // We expect an array of link objects
}

// GET function now fetches notes along with their category name
export async function GET() {
  const admin = getSupabaseAdmin()
  
  // --- MODIFIED ---
  // The query now joins with `note_categories` to get the category name.
  // The `links` column is also selected.
  const { data, error } = await admin
    .from("notes")
    .select(`
      id,
      title,
      content,
      created_at,
      links,
      category_id,
      note_categories ( name ) 
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET Notes Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reshape the data to be more frontend-friendly
  const reshapedData = data.map(note => ({
    ...note,
    // @ts-ignore
    category_name: note.note_categories?.name || null // Flatten the nested category name
  }));

  return NextResponse.json({ data: reshapedData })
}

// POST function now handles category_id and links
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as NotePayload

  if (!body?.content) {
    return NextResponse.json({ error: "Missing content" }, { status: 400 })
  }

  // --- MODIFIED --- Build the payload with the new fields
  const payloadToInsert = {
    title: body.title?.trim() || "Catatan",
    content: body.content.trim(),
    category_id: body.category_id || null, // Can be null if no category is selected
    links: body.links && body.links.length > 0 ? body.links : null // Store links if they exist
  }
  
  const { data, error } = await admin
    .from("notes")
    .insert(payloadToInsert)
    .select(`
      id,
      title,
      content,
      created_at,
      links,
      category_id,
      note_categories ( name )
    `)
    .single()

  if (error) {
    console.error("POST Note Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Reshape the single returned object
  const reshapedData = {
    ...data,
    // @ts-ignore
    category_name: data.note_categories?.name || null
  };

  return NextResponse.json({ data: reshapedData })
}

// PUT function is now upgraded to handle new fields
export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as NotePayload

  if (!body?.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  // --- MODIFIED --- Dynamically build the update payload
  const payloadToUpdate: { [key: string]: any } = {}
  if (body.title !== undefined) payloadToUpdate.title = body.title
  if (body.content !== undefined) payloadToUpdate.content = body.content
  if (body.category_id !== undefined) payloadToUpdate.category_id = body.category_id
  if (body.links !== undefined) payloadToUpdate.links = body.links

  const { data, error } = await admin
    .from("notes")
    .update(payloadToUpdate)
    .eq("id", body.id)
    .select(`
      id,
      title,
      content,
      created_at,
      links,
      category_id,
      note_categories ( name )
    `)
    .single()

  if (error) {
    console.error("PUT Note Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reshapedData = {
    ...data,
    // @ts-ignore
    category_name: data.note_categories?.name || null
  };

  return NextResponse.json({ data: reshapedData })
}

// DELETE function remains the same, no changes needed
export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("notes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
