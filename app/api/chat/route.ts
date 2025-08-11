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
          "Fetches event information from the database. Use this to answer any questions about schedules, activities, or what's happening at the mosque.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Keywords from an event title to search for. Can be blank.",
            },
            // --- NEW PARAMETERS FOR DATES ---
            startDate: {
                type: 'string',
                description: "The start date for the event search window, in YYYY-MM-DD format. Inferred from the user's query."
            },
            endDate: {
                type: 'string',
                description: "The end date for the event search window, in YYYY-MM-DD format. Inferred from the user's query."
            }
          },
          additionalProperties: false,
        } as const,
        execute: async (args) => {
          console.log("AI is calling getEventData with arguments:", args);

          const { query, startDate, endDate } = args;

          let dbQuery = supabase
            .from("events")
            .select("title, starts_at, location, description, recurrence")
            // Always order by the event date to show the soonest first
            .order('starts_at', { ascending: true });

          // --- UPDATED QUERY LOGIC ---
          if (startDate) {
            dbQuery = dbQuery.gte('starts_at', startDate);
          } else {
            // If no start date, default to showing upcoming events from today
            dbQuery = dbQuery.gte('starts_at', new Date().toISOString());
          }

          if (endDate) {
            dbQuery = dbQuery.lte('starts_at', endDate);
          }
          
          if (query && query.trim() !== "") {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          }

          const { data, error } = await dbQuery.limit(20);

          const toolResult = {
            events: data,
            error: error?.message,
            eventsFound: data?.length ?? 0
          }
          console.log("Result being sent back to AI:", toolResult);

          // Return a structured object with the data, or an error.
          // The AI will use this to formulate its final response.
          return toolResult;
        },
      }),
    }

    // --- HEAVILY REVISED SYSTEM PROMPT ---
    const system = `
You are a friendly and helpful AI assistant for Mesjid Al-Muhajirin Sarimas. Your primary goal is to answer questions about events at the mosque.

**CONTEXT**
- Today's date is: ${new Date().toLocaleDateString('en-CA')} (YYYY-MM-DD). Use this to calculate date ranges for user queries like "this week", "next month", etc.
- When a user asks about events in "minggu ini" (this week), calculate the date range from today until next Sunday.
- When a user asks about events in "minggu depan" (next week), calculate the date range for the entire following week (Monday to Sunday).
- Always default to searching for UPCOMING events unless the user specifically asks about past events.

**RESPONSE RULES**
1.  For simple greetings like "hallo" or "hai", respond with a friendly greeting, e.g., "Halo! Ada yang bisa saya bantu terkait acara di Mesjid Al-Muhajirin?". Do NOT use a tool for this.
2.  For any other question, you MUST use the 'getEventData' tool to find information.
3.  When calling the tool, determine the 'startDate' and 'endDate' from the user's request and today's date.
4.  After the tool runs:
    - If 'eventsFound' is greater than 0, present the events in a clear, bulleted list.
    - If 'eventsFound' is 0, you MUST inform the user that no events were found for their request. For example: "Maaf, tidak ada acara yang ditemukan untuk minggu depan."
    - If there is an 'error' message, you MUST inform the user that something went wrong. For example: "Maaf, terjadi kesalahan saat mencari informasi acara."
5.  You MUST ALWAYS provide a text response. Do not give a blank or empty response.
`.trim();


    const result = streamText({
      model: google("gemini-1.5-flash"),
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
