// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
} from "ai"
import { createClient } from "@supabase/supabase-js"

// --- DATE HELPER FUNCTIONS ---
// This moves the complex date logic into reliable code, which was a key improvement.
const getWeekDateRange = (offset = 0) => {
    const now = new Date();
    // In JS, Sunday is 0. We'll treat Monday as the start of the week.
    const currentDay = now.getDay(); 
    const daysToMonday = (currentDay === 0) ? -6 : 1 - currentDay;

    // Set to the Monday of the target week
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);

    // Set to the Sunday of the same week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { startDate: monday, endDate: sunday };
}

export const maxDuration = 30;

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
          "Fetches event information from the database based on a timeframe. Use this for all questions about events, schedules, or activities.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Keywords from an event title to search for. Can be blank.",
            },
            timeframe: {
                type: 'string',
                enum: ['this-week', 'next-week', 'all-upcoming', 'past'],
                description: "The time window to search for events. Defaults to 'all-upcoming' if not specified by the user."
            }
          },
          required: ['timeframe'] // Make timeframe a required parameter for the tool
        } as const,
        execute: async (args) => {
          console.log("AI is calling getEventData with arguments:", args);
          const { query, timeframe } = args;

          let startDate, endDate;

          // Reliable date logic now lives here
          if (timeframe === 'this-week') {
              ({ startDate, endDate } = getWeekDateRange(0));
          } else if (timeframe === 'next-week') {
              ({ startDate, endDate } = getWeekDateRange(1));
          } else if (timeframe === 'all-upcoming') {
              startDate = new Date();
          }

          let dbQuery = supabase
            .from("events")
            .select("title, starts_at, location, description, recurrence")
            .order('starts_at', { ascending: timeframe === 'past' ? false : true });
          
          if (timeframe === 'past') {
            dbQuery = dbQuery.lte('starts_at', new Date().toISOString());
          } else {
            if(startDate) dbQuery = dbQuery.gte('starts_at', startDate.toISOString());
            if(endDate) dbQuery = dbQuery.lte('starts_at', endDate.toISOString());
          }
          
          if (query && query.trim() !== "") {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          }

          const { data, error } = await dbQuery.limit(20);

          // Return a structured result that the AI can easily understand and act upon
          return { 
            eventsFound: data?.length ?? 0, 
            events: data, 
            error: error?.message,
            timeframe: timeframe // Return the timeframe so the AI has context for its response
          };
        },
      }),
    }

    // A single, comprehensive system prompt for our one AI
    const system = `
You are a smart, polite, and reliable AI assistant for Mesjid Al-Muhajirin Sarimas. You will answer questions about mosque events in Bahasa Indonesia.

**YOUR PROCESS**
1.  Analyze the user's request to understand what they are asking for.
2.  You MUST use the 'getEventData' tool to find information. Do not answer from your own knowledge.
3.  Based on the tool's output, you MUST formulate a final, helpful response to the user.

**TOOL USAGE RULES**
- If the user asks about "minggu ini" or "pekan ini", set the 'timeframe' parameter to "this-week".
- If the user asks about "minggu depan" or "pekan depan", set 'timeframe' to "next-week".
- If the user asks about past events, set 'timeframe' to "past".
- For general questions like "ada acara apa?", default to setting 'timeframe' to "all-upcoming".
- Extract keywords like "kajian" or "jumat" into the 'query' parameter.

**RESPONSE GENERATION RULES - YOU MUST FOLLOW THESE**
- **If the tool returns 'eventsFound: 0'**: You MUST inform the user that no events were found for their specific request. Be specific. Example: "Maaf, tidak ada acara kajian yang ditemukan untuk minggu depan."
- **If the tool returns events**: List them clearly using Markdown bullet points. Include the title (bolded), date/time, and description. Example: "Tentu, berikut adalah acara untuk minggu ini: * **Kajian Subuh**: Sabtu, 16 Agustus 2025 - Kajian Tafsir..."
- **If the tool returns an 'error'**: Apologize and tell the user there was a system error.
- **NEVER give a blank or empty response.** If you are confused, ask for clarification.
`.trim();

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
      tools,
    });

    return result.toUIMessageStreamResponse();

  } catch (err) {
    console.error(err);
    // Provide a more user-friendly error response on the server side
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500,
    });
  }
}
