import { google } from "@ai-sdk/google"
import { streamText, type UIMessage, convertToModelMessages } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { messages, context }: { messages: UIMessage[]; context?: unknown } = payload

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }), { status: 401 })
    }

    // Strict policy and scope
    const system = [
      "Anda adalah asisten untuk Mesjid Al-Muhajirin Sarimas.",
      "Batasan:",
      "- Hanya jawab berdasarkan data situs yang diberikan (events, keuangan ringkas, konten beranda) atau informasi keagamaan faktual yang tidak kontroversial (mis. definisi dasar, waktu sholat/puasa secara umum).",
      "- Tolak pertanyaan kontroversial, politik, sektarian, perdebatan, atau topik di luar cakupan. Jangan berspekulasi.",
      "- Jika data yang diminta tidak tersedia, jawab singkat bahwa data tidak tersedia dan sarankan untuk memeriksa sumber resmi setempat.",
      "- Jawab ringkas dalam Bahasa Indonesia.",
      "Gaya: sopan, netral, tidak berdebat.",
      "",
      "Data situs (ringkas):",
      JSON.stringify(context ?? {}, null, 2),
    ].join("\n")

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 })
  }
}
