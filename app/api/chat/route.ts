// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
} from "ai"

// Note: createClient and `tool` are no longer imported.

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    // We only check for the Google API key now.
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing API credentials" }), {
        status: 401,
      })
    }

    // --- The Supabase client and `tools` object have been removed. ---

    // A simple, unrestricted system prompt.
    const system = `You are a helpful assistant.`

    const result = streamText({
      model: google("gemini-1.5-flash"),
      system,
      messages: convertToModelMessages(messages),
      // The `tools` property has been removed.
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), {
      status: 500,
    })
  }
}
