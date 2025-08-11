// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
  CoreMessage,
  ToolCallPart, // Import ToolCallPart
  ToolResultPart,
} from "ai"
import { createClient } from "@supabase/supabase-js"

// --- DATE HELPER FUNCTIONS (Unchanged) ---
const getWeekDateRange = (offset = 0) => {
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + (offset * 7));
    monday.setHours(0, 0, 0, 0);
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

    // --- STEP 1: THE "WORKER" AI (Unchanged) ---
    const workerSystemPrompt = `
You are a data-fetching AI. Your only goal is to analyze the user's request and call the 'getEventData' tool correctly.
- For "minggu ini", use timeframe "this-week".
- For "minggu depan", use timeframe "next-week".
- For general queries, use timeframe "all-upcoming".
- Do not answer the user directly. Only call the tool.
    `.trim()

    const tools = {
      getEventData: tool({
        description: "Fetches event information from the database based on a timeframe.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Keywords from an event title. Can be blank." },
            timeframe: { type: 'string', enum: ['this-week', 'next-week', 'all-upcoming'], description: "The time window to search." }
          },
        } as const,
        execute: async (args) => {
          console.log("Worker AI called getEventData with:", args);
          const { query, timeframe = 'all-upcoming' } = args;
          let startDate, endDate;

          if (timeframe === 'this-week') ({ startDate, endDate } = getWeekDateRange(0));
          if (timeframe === 'next-week') ({ startDate, endDate } = getWeekDateRange(1));
          else startDate = new Date();

          let dbQuery = supabase.from("events").select("title, starts_at, location, description, recurrence").order('starts_at', { ascending: true });
          if(startDate) dbQuery = dbQuery.gte('starts_at', startDate.toISOString());
          if(endDate) dbQuery = dbQuery.lte('starts_at', endDate.toISOString());
          if (query && query.trim() !== "") dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          
          const { data, error } = await dbQuery.limit(20);
          
          return { eventsFound: data?.length ?? 0, events: data, error: error?.message };
        },
      }),
    };
    
    const workerResult = await streamText({
      model: google("gemini-2.5-flash"),
      system: workerSystemPrompt,
      messages: convertToModelMessages(messages),
      tools,
    });

    // --- CORRECTED LOGIC TO CAPTURE TOOL CALL AND RESULT ---
    let toolCallPart: ToolCallPart | undefined;
    let toolResultPart: ToolResultPart<any> | undefined;

    for await (const part of workerResult.fullStream) {
        if (part.type === 'tool-call') {
            toolCallPart = part;
        }
        if (part.type === 'tool-result') {
            toolResultPart = part;
        }
    }
    
    // --- STEP 2: THE "PRESENTER" AI ---
    const presenterSystemPrompt = `
You are a helpful and polite AI assistant for Mesjid Al-Muhajirin. Your task is to present event information to the user in a clear and friendly way, in Bahasa Indonesia.
You will be given the result of a database search. Your job is to turn this data into a conversational response.
**RESPONSE RULES:**
- If 'eventsFound' is 0: Inform the user that no events were found. Example: "Maaf, tidak ada acara yang ditemukan untuk minggu depan."
- If 'eventsFound' > 0: List each event using Markdown bullet points (*). For each event, include the **title** (bolded), **description**, and **waktu** (time).
- If there is an 'error': Apologize and state there was a problem.
- Do not mention the JSON object or the tool. Just present the final, clean answer.
`.trim();

    // --- CORRECTED MESSAGE ASSEMBLY ---
    const presenterMessages: CoreMessage[] = [...convertToModelMessages(messages)];

    if (toolCallPart && toolResultPart) {
      // If a tool was used, add the assistant's decision to call the tool...
      presenterMessages.push({
        role: 'assistant',
        content: [toolCallPart], 
      });
      // ...and then add the result of that tool call.
      presenterMessages.push({
        role: 'tool',
        content: [toolResultPart],
      });
    } else {
      // If no tool was called (e.g., for a simple greeting), add a default response.
      presenterMessages.push({
        role: 'assistant',
        content: "Halo! Ada yang bisa saya bantu terkait acara di Mesjid Al-Muhajirin?",
      });
    }

    // Call the presenter AI and stream ITS response to the user.
    const presenterResult = await streamText({
        model: google('gemini-2.5-flash'),
        system: presenterSystemPrompt,
        messages: presenterMessages, // This is now a valid message history
    });
    
    return presenterResult.toUIMessageStreamResponse();

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), {
      status: 500,
    });
  }
}
