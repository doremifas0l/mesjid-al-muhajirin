import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "site-assets"

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const form = await req.formData()
  const file = form.get("file")
  const folder = (form.get("folder") as string) || "misc"

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 })
  }

  // Ensure bucket exists (ignore if already exists)
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/*"],
  }).catch(() => {})

  const ext = file.name.split(".").pop() || "bin"
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ path, publicUrl: pub.publicUrl })
}
