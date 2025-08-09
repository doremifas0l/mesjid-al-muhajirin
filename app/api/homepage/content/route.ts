import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

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
  const payload = {
    id: "default",
    site_title: body.site_title ?? null,
    hero_tag: body.hero_tag ?? null,
    announcement: body.announcement ?? null,
    about_title: body.about_title ?? null,
    about_body: body.about_body ?? null,
    about_bullets: Array.isArray(body.about_bullets) ? body.about_bullets : [],
    events_title: body.events_title ?? null,
    events_subtitle: body.events_subtitle ?? null,
    youtube_title: body.youtube_title ?? null,
    youtube_subtitle: body.youtube_subtitle ?? null,
    featured_video_url: body.featured_video_url ?? null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await admin.from("homepage_content").upsert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
