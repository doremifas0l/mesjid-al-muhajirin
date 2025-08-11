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

          dbQuery = dbQuery.gte('starts_at', startDate ? startDate : new Date().toISOString());

          if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
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

    // A prompt focused on conversation, context, and data consistency.
    const system = `
You are a smart, conversational AI assistant for Mesjid Al-Muhajirin. Your primary goal is to help users find information about mosque events.

**CONTEXT**
- Today's Date is: ${new Date().toLocaleDateString('en-CA')} (Format: YYYY-MM-DD). Use this as your reference for all date-related questions.

**INSTRUCTIONS**
1.  Read the full CONVERSATION HISTORY to understand the user's request, especially for follow-up questions.
2.  Your main task is to call the 'getEventData' tool to find event information.
3.  Infer the 'startDate' and 'endDate' from the user's message. If the user asks a general question like "ada acara apa?", do not provide any dates to the tool.
4.  After the tool runs, you MUST generate a final response based on the data returned.
5.  **--- THE SOURCE OF TRUTH RULE ---**: When presenting event details, you MUST use the structured 'starts_at' field for all date and time information. IGNORE any conflicting dates you see inside the text 'description' field. This is the most important rule to avoid confusion.
6.  You can answer general, non-offensive questions that are not related to events using your own knowledge.
7.  If the tool returns events, list them clearly. Format the date like this: "Sabtu, 16 Agustus 2025".
8.  If the tool returns no events, clearly state that nothing was found.
9.  NEVER give a blank response. If you are confused, ask for clarification.
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
