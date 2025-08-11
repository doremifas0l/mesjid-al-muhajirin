// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
} from "ai"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY
    ) {
      return new Response(JSON.stringify({ error: "Missing API credentials" }), {
        status: 401,
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const tools = {
      getEventData: tool({
        description:
          "Fetches a list of events from the database. Use this for any question about schedules, activities, or what's happening at the mosque.",
        parameters: {
          type: "object",
          properties: {
            time_period: {
              type: "string",
              enum: ["upcoming", "past"],
              description:
                "Filter for 'upcoming' or 'past' events. Defaults to 'upcoming'.",
            },
            query: {
              type: "string",
              description: "Keywords from an event title to search for. Leave blank to fetch all events.",
            },
            limit: {
              type: "integer",
              description: "The maximum number of events to return. Defaults to 10.",
            }
          },
          additionalProperties: false,
        } as const,
        execute: async (args) => {
          console.log("AI is calling getEventData with arguments:", args);

          const { time_period = "upcoming", query, limit = 10 } = args;

          let dbQuery = supabase
            .from("events")
            .select("title, starts_at, location, description, recurrence");

          const now = new Date().toISOString();

          if (time_period === "past") {
            dbQuery = dbQuery.lte("starts_at", now).order("starts_at", { ascending: false });
          } else {
            dbQuery = dbQuery.gte("starts_at", now).order("starts_at", { ascending: true });
          }
          
          if (query && query.trim() !== "") {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          }

          const { data, error } = await dbQuery.limit(limit);

          if (error) {
            console.error("Supabase query error:", error);
            // Give the AI a specific error message to relay to the user.
            return { result: "ERROR: There was a problem connecting to the database." };
          }
          
          console.log("Data returned from Supabase:", data);
          
          // --- THIS IS THE KEY CHANGE ---
          // If data is empty, return a specific, machine-readable message.
          if (!data || data.length === 0) {
            return { result: "INFO: No events were found matching the user's request." };
          }
          
          return { events: data };
        },
      }),
    }

    // --- NEW, HIGHLY-STRUCTURED SYSTEM PROMPT ---
    const system = `
You are an AI assistant for Mesjid Al-Muhajirin Sarimas. You MUST follow these rules precisely.

**RESPONSE LOGIC FLOW**
You must process every user request by following these steps:
1.  Determine if the user is asking about an event. If so, call the 'getEventData' tool.
2.  Analyze the result from the 'getEventData' tool.
3.  **If the tool returns a list of 'events'**: Synthesize the information into a friendly, bulleted list for the user. Include the title and start time.
4.  **If the tool returns a 'result' containing 'INFO: No events were found'**: You MUST respond to the user with the exact phrase: "Maaf, saya tidak dapat menemukan acara yang sesuai dengan permintaan Anda."
5.  **If the tool returns a 'result' containing 'ERROR'**: You MUST respond to the user with the exact phrase: "Maaf, terjadi kesalahan saat mengambil data acara. Silakan coba lagi nanti."
6.  **If you are unable to call the tool or do not understand the request**: You MUST respond with the exact phrase: "Maaf, saya tidak mengerti permintaan Anda. Bisakah Anda menjelaskannya dengan cara lain?"

**IMPORTANT RESTRICTIONS**
- You CANNOT add, update, or delete events. If a user asks, politely refuse and explain you can only provide information.
- You MUST answer in Bahasa Indonesia unless the user speaks in another language.
- Never ever reply with blanks, you must say something related to the condition
**CONTEXT**
- Today's Date: ${new Date().toLocaleDateString('en-CA')} (YYYY-MM-DD)
    `.trim();


    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
      tools,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), {
      status: 500,
    })
  }
}
