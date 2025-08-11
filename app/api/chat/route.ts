// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
} from "ai"
import { createClient } from "@supabase/supabase-js"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    // Check for all necessary credentials again
    if (
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY
    ) {
      return new Response(JSON.stringify({ error: "Missing API credentials" }), {
        status: 401,
      })
    }

    // Initialize the Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    // Define the new tool for fetching event data
    const tools = {
      getEventData: tool({
        description:
          "Get information about current, upcoming, or past events. Use this to answer questions about schedules, activities, or what's happening at the mosque.",
        parameters: {
          type: "object",
          properties: {
            time_period: {
              type: "string",
              enum: ["upcoming", "past"],
              description:
                "Specify whether to look for 'upcoming' or 'past' events. Defaults to 'upcoming' if not specified.",
            },
            query: {
              type: "string",
              description: "A specific event title or topic to search for, e.g., 'Kajian Rutin' or 'Idul Adha'.",
            },
            limit: {
              type: "integer",
              description: "The maximum number of events to return. Defaults to 5.",
            }
          },
          additionalProperties: false,
        } as const,
        execute: async ({ time_period = "upcoming", query, limit = 5 }) => {
          // Select from the 'events' table
          let dbQuery = supabase
            .from("events")
            .select("title, starts_at, location, description, recurrence, attachment")

          const now = new Date().toISOString()

          if (time_period === "past") {
            // For past events, find events that started before now
            // and order them with the most recent first.
            dbQuery = dbQuery.lte("starts_at", now).order("starts_at", { ascending: false })
          } else {
            // For upcoming events, find events starting from now
            // and order them with the soonest first.
            dbQuery = dbQuery.gte("starts_at", now).order("starts_at", { ascending: true })
          }
          
          if (query) {
            // Search within the title and description for the user's query
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          }

          const { data, error } = await dbQuery.limit(limit)

          if (error) {
            console.error("Supabase query error:", error)
            return { error: `Failed to fetch event data: ${error.message}` }
          }
          
          if (!data || data.length === 0) {
            return { result: "No events found matching the criteria." }
          }
          
          return { events: data }
        },
      }),
    }

    // Update the system prompt to be aware of the new tool and today's date
    const system = `You are a helpful assistant for Mesjid Al-Muhajirin Sarimas.
- Answer user questions about events by calling the 'getEventData' tool.
- Synthesize the information from the tool into a friendly and clear response.
- If the tool returns no events, inform the user that no events were found.
- Today's date is ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
      tools, // Pass the new tools object to the model
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), {
      status: 500,
    })
  }
}
