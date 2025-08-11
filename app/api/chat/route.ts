// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
} from "ai"
import { createClient } from "@supabase/supabase-js"

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
        description: "Gets a list of events from the database based on a date range.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Keywords to search for in the event title or description." },
            // These are optional. The AI will provide them if it can infer them from the conversation.
            startDate: { type: "string", description: "The start date of the search window, format YYYY-MM-DD." },
            endDate: { type: "string", description: "The end date of the search window, format YYYY-MM-DD." },
          },
        } as const,
        execute: async (args) => {
          console.log("AI is calling getEventData with arguments:", args);
          const { query, startDate, endDate } = args;

          let dbQuery = supabase
            .from("events")
            .select("title, starts_at, location, description, recurrence")
            .order('starts_at', { ascending: true });

          // --- SMART DEFAULTS ---
          // If a start date is provided, use it. Otherwise, default to right now.
          // This elegantly handles both specific queries and general "what's upcoming" questions.
          dbQuery = dbQuery.gte('starts_at', startDate ? startDate : new Date().toISOString());

          if (endDate) {
            // Add an end date to the query only if it's provided.
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999); // Ensure we get events happening anytime on the end date
            dbQuery = dbQuery.lte('starts_at', endOfDay.toISOString());
          }
          
          if (query && query.trim() !== "") {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          }

          const { data, error } = await dbQuery.limit(25);
          return { events: data, error: error?.message };
        },
      }),
    }

    // --- The most important part: A prompt focused on conversation and context ---
    const system = `
You are a smart, conversational AI assistant for Mesjid Al-Muhajirin. Your primary goal is to help users find information about mosque events.

**CONTEXT**
- Today's Date is: ${new Date().toLocaleDateString('en-CA')} (Format: YYYY-MM-DD). Use this as your reference for all date-related questions.

**INSTRUCTIONS**
1.  **Analyze the full CONVERSATION HISTORY** to understand the user's request, especially for follow-up questions.
2.  Your main task is to determine if the user is asking for events within a specific date range.
3.  Based on the user's message and the conversation history, call the 'getEventData' tool.
    -   **Examples of how to determine dates:**
        -   User: "ada event apa hari rabu 13 agustus?" -> Call tool with startDate: '2025-08-13', endDate: '2025-08-13'.
        -   User: "kalo minggu ini ada apa?" (what about this week?) -> Calculate the start and end dates for the current week and pass them to the tool.
        -   User: "ada acara apa saja?" (general question) -> **Do not provide startDate or endDate**. The tool will correctly default to all upcoming events.
4.  After the tool runs, you MUST generate a final response.
    -   If the tool returns events, list them clearly. Format the date like this: "Rabu, 13 Agustus 2025".
    -   If the tool returns no events, clearly state that nothing was found for their request.
    -   If the tool returns an error, apologize for the system error.
5.  **NEVER give a blank response.** If you are totally confused, just say: "Maaf, saya kurang mengerti. Bisa tolong perjelas pertanyaannya?"
6.  You can answer question that is not offensive with your own knowledge
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
