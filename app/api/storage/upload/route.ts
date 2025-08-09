import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// Single public bucket for site assets; organize by folders (homepage/, events/, etc.)
const BUCKET = "site-assets"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    const folder = String(form.get("folder") || "misc").replace(/[^a-zA-Z0-9/_-]/g, "")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Ensure bucket exists and is public
    const { data: bucketInfo, error: getErr } = await admin.storage.getBucket(BUCKET)
    if (getErr || !bucketInfo) {
      // Create bucket public with basic limits; adjust as needed
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10 MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    }

    const basename = file.name?.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "") || "upload"
    const ext = basename.includes(".") ? basename.split(".").pop() : ""
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext ? `.${ext}` : ""}`
    const path = `${folder}/${name}`

    // Upload file bytes
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ path, publicUrl: pub.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 })
  }
}
