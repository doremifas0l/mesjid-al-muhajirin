import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { nanoid } from "nanoid"

const BUCKET_NAME = "knowledge_files"

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  // --- THIS IS THE NEW, INTEGRATED CODE ---
  // This block will attempt to create the bucket with the correct policies.
  // The .catch(() => {}) is crucial: it ignores the error if the bucket already exists,
  // allowing the code to proceed without crashing.
  await admin.storage.createBucket(BUCKET_NAME, {
    public: true, // Make files publicly accessible
    fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
    allowedMimeTypes: [ // Define allowed file types for security
        "application/pdf", 
        "text/plain", 
        "text/markdown"
    ],
  }).catch(() => {
    // Ignore any error, which likely means the bucket already exists.
  })
  // --- END OF NEW CODE ---

  const fileExtension = file.name.split(".").pop() || "bin"
  const fileName = `${nanoid()}.${fileExtension}`
  
  const { data: uploadData, error: uploadError } = await admin.storage
    .from(BUCKET_NAME)
    .upload(fileName, file)

  if (uploadError) {
    console.error("Supabase Knowledge Upload Error:", uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }
  
  const { data: publicUrlData } = admin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uploadData.path)

  if (!publicUrlData) {
    return NextResponse.json({ error: "Could not get public URL." }, { status: 500 })
  }

  return NextResponse.json({ 
    publicUrl: publicUrlData.publicUrl,
    path: uploadData.path
  })
}
