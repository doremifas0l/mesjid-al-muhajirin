import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

type RequestPayload = {
  title: string
  content: string
  links: { url: string; label: string }[]
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as RequestPayload

  try {
    const { data: categories, error: categoriesError } = await admin
      .from("note_categories")
      .select("id, name")
    if (categoriesError) throw new Error("Could not fetch categories: " + categoriesError.message)

    const categoryNames = categories?.map(c => c.name) || []

    // --- MODIFIED --- The Zod schema descriptions are now in Indonesian to reinforce the language instruction.
    const aiResponseSchema = z.object({
      enhanced_content: z.string().describe("Tingkatkan dan perbaiki konten. Buat agar jelas, terstruktur, dan informatif. Gunakan Bahasa Indonesia yang baik dan benar."),
      suggested_category_name: z.string().describe(`Kategori yang paling cocok dari daftar ini: [${categoryNames.join(", ")}]. Jika tidak ada, buat kategori baru yang relevan dalam Bahasa Indonesia (maksimal 3 kata).`),
    })

    // --- MODIFIED --- The main prompt is now more direct about using Indonesian.
    const { object: aiResponse } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: aiResponseSchema,
      prompt: `Anda adalah asisten cerdas untuk sebuah website masjid.
      Tugas Anda adalah untuk memproses catatan yang diberikan oleh admin.
      Berdasarkan judul dan konten berikut:
      Judul: "${body.title}"
      Konten: "${body.content}"

      Lakukan tugas-tugas berikut, dan pastikan SEMUA output Anda dalam Bahasa Indonesia:
      1. Tingkatkan konten yang diberikan. Buat agar lebih jelas, terstruktur dengan baik, dan informatif.
      2. Tentukan kategori yang paling cocok untuk catatan ini dari daftar yang ada: [${categoryNames.join(", ")}]. Jika tidak ada yang cocok, buat nama kategori baru yang relevan dalam Bahasa Indonesia.`,
    })

    const { enhanced_content, suggested_category_name } = aiResponse

    let category_id = null
    const existingCategory = categories?.find(c => c.name.toLowerCase() === suggested_category_name.toLowerCase())

    if (existingCategory) {
      category_id = existingCategory.id
    } else {
      const { data: newCategory, error: newCategoryError } = await admin
        .from("note_categories")
        .insert({ name: suggested_category_name })
        .select("id")
        .single()
      if (newCategoryError) throw new Error("Could not create new category: " + newCategoryError.message)
      category_id = newCategory.id
    }

    const payloadToInsert = {
      title: body.title,
      content: enhanced_content,
      category_id: category_id,
      links: body.links.length > 0 ? body.links : null,
    }

    const { data: finalNote, error: insertError } = await admin
      .from("notes")
      .insert(payloadToInsert)
      .select(`id, title, content, created_at, links, category_id, note_categories ( name )`)
      .single()
    if (insertError) throw new Error("Could not save final note: " + insertError.message)
    
    const reshapedData = {
      id: finalNote.id,
      title: finalNote.title,
      content: finalNote.content,
      created_at: finalNote.created_at,
      links: finalNote.links,
      category_id: finalNote.category_id,
      // @ts-ignore
      category_name: finalNote.note_categories?.name || suggested_category_name
    };
    return NextResponse.json({ data: reshapedData })

  } catch (error: any)
  {
    console.error("AI Processing Error:", error)
    return NextResponse.json({ error: "Gagal memproses dengan AI: " + error.message }, { status: 500 })
  }
}
