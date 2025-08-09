import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "site-assets"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string | null) ?? "misc"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Ensure bucket exists and is public
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 })
    }
    const exists = buckets?.some((b: any) => b.name === BUCKET)
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        // Optional restrictions to images up to 10MB (see docs)
        allowedMimeTypes: ["image/*"],
        fileSizeLimit: "10MB",
      })
      // If bucket already exists on a race condition, ignore
      if (createErr && !/exists/i.test(createErr.message)) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
    }

    const ext = (() => {
      const parts = file.name.split(".")
      const e = parts.length > 1 ? parts.pop() : ""
      return (e || "bin").toLowerCase()
    })()

    const safeName = file.name.replace(/\s+/g, "-").toLowerCase()
    const path = `${folder}/${crypto.randomUUID()}-${safeName}.${ext}`

    // Use ArrayBuffer per supabase-js upload support
    const ab = await file.arrayBuffer()

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, ab, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    })
    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ path, publicUrl: pub.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 })
  }
}
