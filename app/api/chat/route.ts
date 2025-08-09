import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

function nextOccurrence(start: Date, kind: "daily" | "weekly" | "monthly", now = new Date()) {
  const d = new Date(start)
  if (kind === "daily") {
    while (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1)
  } else if (kind === "weekly") {
    while (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7)
  } else if (kind === "monthly") {
    while (d.getTime() <= now.getTime()) d.setMonth(d.getMonth() + 1)
  }
  return d
}

export async function POST() {
  const admin = getSupabaseAdmin()
  // Fetch all; recurrence may or may not exist in schema
  const { data, error } = await admin.from("events").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date()
  let created = 0

  for (const row of data || []) {
    const rec = (row as any).recurrence as string | undefined
    if (!rec || rec === "one-time") continue

    const start = new Date(String(row.starts_at))
    if (!Number.isFinite(start.getTime())) continue
    if (start.getTime() > now.getTime()) continue

    if (rec === "daily" || rec === "weekly" || rec === "monthly") {
      const nextDate = nextOccurrence(start, rec, now)
      const nextIso = nextDate.toISOString()
      // Skip if duplicate already exists (same title and time)
      const { data: exists, error: exErr } = await admin
        .from("events")
        .select("id")
        .eq("title", row.title)
        .eq("starts_at", nextIso)
        .limit(1)

      if (exErr) continue
      if (exists && exists.length > 0) continue

      const payload: any = {
        title: row.title,
        starts_at: nextIso,
        location: row.location ?? "Masjid",
        description: row.description ?? "",
        image_url: row.image_url ?? null,
        image_path: row.image_path ?? null,
        recurrence: rec,
      }

      const { error: insErr } = await admin.from("events").insert(payload as any)
      if (!insErr) created++
    }
  }

  return NextResponse.json({ created })
}
