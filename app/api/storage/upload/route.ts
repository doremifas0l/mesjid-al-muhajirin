import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "site-assets"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const folder = (form.get("folder") as string | null) ?? "uploads"

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Ensure bucket exists (public)
    const { data: buckets } = await admin.storage.listBuckets()
    const exists = (buckets || []).some((b) => b.name === BUCKET)
    if (!exists) {
      await admin.storage
        .createBucket(BUCKET, {
          public: true,
          fileSizeLimit: "20MB",
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        })
        .catch(() => {
          // ignore if created concurrently
        })
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase()
    const safeExt = ext && ext.length <= 5 ? `.${ext}` : ""
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`
    const path = `${folder}/${name}`

    const arrayBuf = await file.arrayBuffer()
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, arrayBuf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
    if (upErr) {
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ path, publicUrl: pub.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 })
  }
}
