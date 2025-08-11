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
              description: "Keywords from an event title or description to search for (e.g., 'Kajian Rutin'). Can be left blank to fetch all events for the given time period.",
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
            .select("title, starts_at, location, description, recurrence, attachment");

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
            return { error: `Failed to fetch event data: ${error.message}` };
          }
          
          console.log("Data returned from Supabase:", data);
          
          if (!data || data.length === 0) {
            return { result: "No events were found matching the user's request. Please inform the user clearly." };
          }
          
          return { events: data };
        },
      }),
    }

    // --- NEW, STRUCTURED SYSTEM PROMPT ---
    const system = `
You are an AI assistant for Mesjid Al-Muhajirin Sarimas. Your ONLY function is to provide information about mosque events by fetching data.

**RESPONSE INSTRUCTIONS**
1.  Analyze the user's message to understand what event information they are looking for.
2.  Use the "getEventData" tool to find relevant events.
3.  Present the information from the tool to the user in a clear, friendly, and helpful manner.

**CAPABILITIES**
- You CAN search for upcoming events.
- You CAN search for past events.
- You CAN filter events by keywords (e.g., "kajian", "idul adha").
- You MUST answer in the same language as the user.

**IMPORTANT RESTRICTIONS**
- You CANNOT add, create, or schedule new events.
- You CANNOT update, change, or modify existing events.
- You CANNOT delete or cancel events.
- If a user asks you to perform a restricted action (like creating an event), you MUST politely refuse and state that you can only provide information about existing events.

**CONTEXT**
- Today's Date: ${new Date().toLocaleDateString('en-CA')} (YYYY-MM-DD)
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
