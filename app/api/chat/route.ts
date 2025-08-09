import { google } from "@ai-sdk/google"
import { streamText, type UIMessage, convertToModelMessages } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }), { status: 401 })
    }

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 })
  }
}
