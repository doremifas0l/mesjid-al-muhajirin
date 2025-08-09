import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// Normalize starts_at so the client always receives a valid ISO string
function normalizeIso(input: string | null | undefined) {
  if (!input) return null
  // Replace space with T if needed; then try parse
  const candidate = input.includes(" ") ? input.replace(" ", "T") : input
  const d = new Date(candidate)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("events").select("*").order("starts_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const normalized =
    data?.map((row: any) => ({
      ...row,
      starts_at: normalizeIso(row.starts_at) ?? new Date().toISOString(),
    })) ?? []
  return NextResponse.json({ data: normalized })
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
  // Normalize again on server
  const iso = normalizeIso(body.starts_at)
  if (!iso) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 })

  const { data, error } = await admin
    .from("events")
    .insert({ ...body, starts_at: iso })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ensure response is ISO-safe
  const out = { ...data, starts_at: normalizeIso((data as any).starts_at) ?? iso }
  return NextResponse.json({ data: out })
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

  const patch: any = { ...body }
  if (typeof body.starts_at === "string") {
    const iso = normalizeIso(body.starts_at)
    if (!iso) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 })
    patch.starts_at = iso
  }

  const { data, error } = await admin.from("events").update(patch).eq("id", body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const out = { ...data, starts_at: normalizeIso((data as any).starts_at) ?? (data as any).starts_at }
  return NextResponse.json({ data: out })
}

export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("events").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
