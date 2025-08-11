// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
} from "ai"
import { createClient } from "@supabase/supabase-js"

// --- DATE HELPER FUNCTIONS (Unchanged and Reliable) ---
const getWeekDateRange = (offset = 0) => {
    const now = new Date();
    const currentDay = now.getDay(); 
    const daysToMonday = (currentDay === 0) ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { startDate: monday, endDate: sunday };
}
const getYearDateRange = (offset = 0) => {
    const now = new Date();
    const year = now.getFullYear() + offset;
    const startDate = new Date(year, 0, 1); // Jan 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31st
    return { startDate, endDate };
}

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Missing API credentials" }), { status: 401 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

    const tools = {
      getEventData: tool({
        description: "Fetches event information from the database.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Keywords from the event title." },
            timeframe: {
                type: 'string',
                enum: ['this-week', 'next-week', 'next-year', 'past', 'all-upcoming'],
                description: "The time window to search for events."
            }
          },
        } as const,
        execute: async (args) => {
          console.log("AI is calling getEventData with arguments:", args);
          const { query, timeframe = 'all-upcoming' } = args; // Default here is a safety net

          let startDate, endDate;

          if (timeframe === 'this-week') ({ startDate, endDate } = getWeekDateRange(0));
          else if (timeframe === 'next-week') ({ startDate, endDate } = getWeekDateRange(1));
          else if (timeframe === 'next-year') ({ startDate, endDate } = getYearDateRange(1));
          
          let dbQuery = supabase
            .from("events")
            .select("title, starts_at, location, description, recurrence")
            .order('starts_at', { ascending: timeframe !== 'past' });
          
          if (timeframe === 'past') {
            dbQuery = dbQuery.lte('starts_at', new Date().toISOString());
          } else {
            if (startDate) dbQuery = dbQuery.gte('starts_at', startDate.toISOString());
            if (endDate) dbQuery = dbQuery.lte('starts_at', endDate.toISOString());
          }
          
          if (query && query.trim() !== "") {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          }

          const { data, error } = await dbQuery.limit(25);
          return { events: data, error: error?.message, _timeframe: timeframe };
        },
      }),
    }

    // A simpler, more direct system prompt.
    const system = `
You are a helpful AI assistant for a mosque. Your only job is to answer questions about events by using the 'getEventData' tool. Answer in Bahasa Indonesia.

**TOOL USAGE INSTRUCTIONS:**
1.  Look for time-related words in the user's latest message.
    - "minggu ini" or "pekan ini" -> use timeframe: 'this-week'
    - "minggu depan" or "pekan depan" -> use timeframe: 'next-week'
    - "minggu lalu" or "sebelumnya" -> use timeframe: 'past'
    - "tahun depan" -> use timeframe: 'next-year'
    - "terdekat" or "paling dekat" (nearest) -> use timeframe: 'all-upcoming'
2.  Extract other keywords (e.g., "kajian") into the 'query' parameter.
3.  **THE GOLDEN RULE:** If the user's request is unclear or has no time words, you MUST call the tool with the timeframe set to 'all-upcoming'. This is your default, safe action.

**RESPONSE GENERATION RULES:**
- After the tool runs, you MUST give a text answer.
- If the tool returns events, list them in a clear, bulleted format.
- If the tool returns no events, you MUST explicitly tell the user. Example: "Maaf, tidak ada acara untuk [timeframe] yang ditemukan."
- If the tool returns an error, apologize for the system issue.
- **NEVER, under any circumstance, give a blank or empty response.**
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
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), { status: 500 });
  }
}
