import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
// --- MODIFIED --- Use the same AI SDK as your chat route
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

    // --- MODIFIED --- Define the expected JSON output using Zod
    const aiResponseSchema = z.object({
      enhanced_content: z.string().describe("The enhanced and improved content. Make it clear, well-structured, and informative. Fix grammar if needed."),
      suggested_category_name: z.string().describe(`The most suitable category name from this list: [${categoryNames.join(", ")}]. If none match, create a new, relevant, and short category name (max 3 words).`),
    })

    // --- MODIFIED --- Use generateObject instead of the other library
    const { object: aiResponse } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: aiResponseSchema,
      prompt: `You are an intelligent assistant for a mosque website. Your task is to process a note submitted by an admin. Based on the following title and content, perform the required tasks. Title: "${body.title}". Content: "${body.content}".`,
    })

    // Now aiResponse is a fully typed and validated object
    const { enhanced_content, suggested_category_name } = aiResponse

    // Find or Create the Category in Supabase
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

    // Save the final, AI-enhanced note to the database
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
