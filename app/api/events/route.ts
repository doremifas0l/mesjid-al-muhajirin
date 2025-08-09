import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

type AnyEventRow = {
  id: string
  title: string
  starts_at?: string | null
  date?: string | null
  time?: string | null
  location?: string | null
  description?: string | null
  image_url?: string | null
  imageUrl?: string | null
  image?: string | null
  image_path?: string | null
  recurrence?: string | null
  [key: string]: any
}

function toIso(candidate?: string | null): string | null {
  if (!candidate) return null
  const c = candidate.includes(" ") && !candidate.includes("T") ? candidate.replace(" ", "T") : candidate
  const d = new Date(c)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function combineDateTime(date?: string | null, time?: string | null): string | null {
  if (!date && !time) return null
  const d = date || new Date().toISOString().slice(0, 10)
  const t = time ? (time.length === 5 ? `${time}:00` : time) : "00:00:00"
  const cand = `${d}T${t}`
  return toIso(cand)
}

function normalizeRow(row: AnyEventRow) {
  const primaryIso = toIso(row.starts_at)
  const fallbackIso = combineDateTime(row.date, row.time) || toIso(row.date)
  const starts_at = primaryIso || fallbackIso || new Date().toISOString()
  const image_url = row.image_url ?? row.imageUrl ?? row.image ?? null
  return {
    ...row,
    starts_at,
    image_url,
  }
}

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("events").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const normalized = (data as AnyEventRow[]).map(normalizeRow)
  normalized.sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
  return NextResponse.json({ data: normalized })
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as AnyEventRow

  const iso = toIso(body.starts_at) || combineDateTime(body.date, body.time)
  if (!iso) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 })

  // Build payload without recurrence by default (avoid column error); add it only if present in DB via try-catch.
  const payload: Record<string, any> = {
    title: body.title ?? "Kegiatan",
    starts_at: iso,
    location: body.location ?? "Masjid",
    description: body.description ?? "",
    image_url: body.image_url ?? null,
    image_path: body.image_path ?? null,
  }

  // Try include recurrence; if server rejects, retry without it
  if (body.recurrence) {
    payload.recurrence = body.recurrence
  }

  let inserted: any = null
  let err: any = null

  const attempt = await admin.from("events").insert(payload).select("*").single()
  inserted = attempt.data
  err = attempt.error

  if (err && String(err.message || "").includes("recurrence")) {
    delete payload.recurrence
    const retry = await admin.from("events").insert(payload).select("*").single()
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 })
    inserted = retry.data
  } else if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ data: normalizeRow(inserted as AnyEventRow) })
}

export async function PUT(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as AnyEventRow & { id?: string }
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const patch: any = {}
  if (typeof body.title === "string") patch.title = body.title
  if (typeof body.location === "string") patch.location = body.location
  if (typeof body.description === "string") patch.description = body.description
  if (typeof body.image_url === "string" || body.image_url === null) patch.image_url = body.image_url
  if (typeof body.image_path === "string" || body.image_path === null) patch.image_path = body.image_path
  if (typeof body.recurrence === "string") patch.recurrence = body.recurrence
  if (body.starts_at) {
    const iso = toIso(body.starts_at) || combineDateTime(body.date, body.time)
    if (!iso) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 })
    patch.starts_at = iso
  }

  let updated: any = null
  let err: any = null
  const attempt = await admin.from("events").update(patch).eq("id", body.id).select("*").single()
  updated = attempt.data
  err = attempt.error

  if (err && String(err.message || "").includes("recurrence")) {
    delete patch.recurrence
    const retry = await admin.from("events").update(patch).eq("id", body.id).select("*").single()
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 })
    updated = retry.data
  } else if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ data: normalizeRow(updated as AnyEventRow) })
}

export async function DELETE(req: Request) {
  const admin = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await admin.from("events").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
