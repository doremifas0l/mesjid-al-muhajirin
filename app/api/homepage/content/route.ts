import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// Define the type for what the body might contain
type HomeContent = {
  site_title?: string
  hero_tag?: string
  announcement?: string
  about_title?: string
  about_body?: string
  about_bullets?: string[]
  events_title?: string
  events_subtitle?: string
  youtube_title?: string
  youtube_subtitle?: string
  featured_video_url?: string
  // This is a helper type for the dynamic payload
  [key: string]: any 
}

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("homepage_content").select("*").eq("id", "default").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as HomeContent

  // --- START OF FIX ---

  // Create a dynamic payload object.
  // This will only contain the fields that were actually sent in the request.
  const payload: HomeContent = {}
  
  // List of all possible keys that can be updated.
  const validKeys: (keyof HomeContent)[] = [
    "site_title", "hero_tag", "announcement", 
    "about_title", "about_body", "about_bullets", 
    "events_title", "events_subtitle", "youtube_title", 
    "youtube_subtitle", "featured_video_url"
  ];
  
  // Populate the payload with data from the request body if the key is valid.
  for (const key of validKeys) {
    if (body[key] !== undefined) {
      payload[key] = body[key]
    }
  }

  // Always update the timestamp
  payload.updated_at = new Date().toISOString()

  // --- END OF FIX ---

  // Use .update() instead of .upsert() since we are only modifying an existing row.
  // The dynamically built payload ensures we only change the fields that were sent.
  const { data, error } = await admin
    .from("homepage_content")
    .update(payload)
    .eq("id", "default")
    .select()
    .single()
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
