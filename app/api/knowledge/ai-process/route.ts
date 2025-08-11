import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the AI client. It automatically uses the key from your .env.local file.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")

type RequestPayload = {
  title: string
  content: string
  links: { url: string; label: string }[]
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()
  const body = (await req.json()) as RequestPayload

  try {
    // 1. Get existing categories from DB to provide as context for the AI
    const { data: categories, error: categoriesError } = await admin
      .from("note_categories")
      .select("id, name")
    if (categoriesError) throw new Error("Could not fetch categories: " + categoriesError.message)

    const categoryNames = categories?.map(c => c.name) || []

    // 2. Define the Prompt for the AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const prompt = `
      Anda adalah asisten cerdas untuk sebuah website masjid.
      Tugas Anda adalah untuk memproses catatan yang diberikan oleh admin.
      Berdasarkan judul dan konten berikut:
      Judul: "${body.title}"
      Konten: "${body.content}"

      Lakukan tugas-tugas berikut:
      1. Tingkatkan (enhance) konten yang diberikan. Buat agar lebih jelas, terstruktur dengan baik, dan informatif. Perbaiki tata bahasa jika perlu.
      2. Tentukan kategori yang paling cocok untuk catatan ini dari daftar kategori yang ada berikut: [${categoryNames.join(", ")}]. Jika tidak ada yang cocok, buat nama kategori baru yang singkat dan relevan (maksimal 3 kata).

      Berikan output Anda HANYA dalam format JSON yang valid, tanpa teks tambahan sebelumnya atau sesudahnya. Strukturnya harus seperti ini:
      {
        "enhanced_content": "Konten yang sudah Anda tingkatkan...",
        "suggested_category_name": "Nama Kategori yang Anda pilih atau buat"
      }
    `

    // 3. Call the AI model
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Clean potential markdown code fences from the AI's response
    const cleanedJsonString = responseText.replace(/```json\n|```/g, "").trim()
    const aiResponse = JSON.parse(cleanedJsonString)
    const { enhanced_content, suggested_category_name } = aiResponse

    if (!enhanced_content || !suggested_category_name) {
      throw new Error("AI response is missing required fields.")
    }

    // 4. Find or Create the Category in Supabase
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

    // 5. Save the final, AI-enhanced note to the database
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
    
    // Reshape the data for the frontend
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

  } catch (error: any) {
    console.error("AI Processing Error:", error)
    return NextResponse.json({ error: "Gagal memproses dengan AI: " + error.message }, { status: 500 })
  }
}
