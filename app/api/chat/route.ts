import { google } from "@ai-sdk/google"
import { streamText, tool, type UIMessage, convertToModelMessages } from "ai" 
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

// ... (keep all your type definitions and helper functions)

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return new Response(JSON.stringify({ error: "Missing API credentials" }), { status: 401 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

    const tools = {
      getFinancialData: tool({
        description: "Get financial data from the database. Can be used to calculate balances, or list incomes and expenses based on various filters.",
        parameters: z.object({
          year: z.number().optional().describe("The year to filter by, e.g., 2024."),
          month: z.number().optional().describe("The month number (1-12) to filter by."),
          type: z.enum(["income", "expense"]).optional().describe("Filter for only income or only expenses."),
          category: z.string().optional().describe("Filter by a specific category, e.g., 'Infaq' or 'Operasional'."),
        }),
        execute: async ({ year, month, type, category }) => {
          let query = supabase.from("finance_transactions").select("type, amount, category, date, note");
          if (year && month) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
          }
          if (type) {
            query = query.eq('type', type);
          }
          if (category) {
            query = query.ilike('category', `%${category}%`);
          }
          const { data, error } = await query.limit(500);
          if (error) return { toolName: 'getFinancialData', result: { error: error.message }};
          return { toolName: 'getFinancialData', result: { transactions: data }};
        },
      }),
      // Add more tools here...
    };

    const system = `You are a helpful assistant for Mesjid Al-Muhajirin Sarimas.
- Answer user questions by calling the available tools to get the necessary data.
- If the tools provide data, synthesize the answer based on that data.
- If the tools return an error or no data, inform the user that the information could not be found.
- Today's date is ${new Date().toISOString()}.`;

    // --- THE FIX IS HERE ---
    // REMOVED `await` to get the handler object synchronously
    const result = streamText({
      model: google('gemini-1.5-flash'),
      system,
      messages: convertToModelMessages(messages),
      tools,
    });

    // Now 'result' is the handler object, and this call will work correctly.
    return result.toAIStreamResponse();

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 });
  }
}```

### A Critical Final Note: The Client-Side

This server-side fix is essential. However, for the tool-calling process to be complete, your frontend (client-side) code **must** be using a Vercel AI SDK hook that is aware of tools/actions, like `useChat` or `useActions`.

The server will send a special message to the client when the AI wants to call a tool. The client-side hook will receive this message, execute the function, and send the result back to the server to complete the loop. Your current error is purely server-side, but this is the next logical step in the chain.
