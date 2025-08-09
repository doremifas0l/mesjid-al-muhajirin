import { google } from "@ai-sdk/google"
// We need the 'tool' helper to define our function
import { streamText, tool, type UIMessage, convertToModelMessages } from "ai" 
import { createClient } from "@supabase/supabase-js"
// Zod is the best way to define the parameters for our tools
import { z } from "zod"

// ... (keep your type definitions and helper functions: FinanceRow, EventRow, etc.)

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return new Response(JSON.stringify({ error: "Missing API credentials" }), { status: 401 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

    // --- Step 1: Define Your "Tools" ---
    // We describe our functions to the AI using a schema.
    const tools = {
      // This is our flexible financial data tool
      getFinancialData: tool({
        description: "Get financial data from the database. Can be used to calculate balances, or list incomes and expenses based on various filters.",
        // Define the parameters the AI can provide.
        parameters: z.object({
          year: z.number().optional().describe("The year to filter by, e.g., 2024."),
          month: z.number().optional().describe("The month number (1-12) to filter by."),
          type: z.enum(["income", "expense"]).optional().describe("Filter for only income or only expenses."),
          category: z.string().optional().describe("Filter by a specific category, e.g., 'Infaq' or 'Operasional'."),
        }),
        // This is the actual code that runs when the AI calls the tool
        execute: async ({ year, month, type, category }) => {
          let query = supabase.from("finance_transactions").select("type, amount, category, date, note");

          // Dynamically build the query based on the AI's parameters
          if (year && month) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // The last day of the month
            query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
          }
          if (type) {
            query = query.eq('type', type);
          }
          if (category) {
            // Use 'ilike' for case-insensitive partial matching
            query = query.ilike('category', `%${category}%`);
          }

          const { data, error } = await query.limit(500);
          if (error) return { error: error.message };
          return { transactions: data };
        },
      }),
      // You can add more tools here, e.g., getEventData
    };

    // --- Step 2: Call the AI and Let It Decide ---
    // The system prompt is now simpler. It just tells the AI its persona and to use tools when needed.
    const system = `You are a helpful assistant for Mesjid Al-Muhajirin Sarimas.
- Answer user questions by calling the available tools to get the necessary data.
- If the tools provide data, synthesize the answer based on that data.
- If the tools return an error or no data, inform the user that the information could not be found.
- Today's date is ${new Date().toISOString()}.`;

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system,
      messages: convertToModelMessages(messages),
      // Provide the tools to the AI
      tools,
    });

    // The Vercel AI SDK handles the tool-calling logic automatically.
    // It will stream back the text, or structured JSON if a tool is being called,
    // which the client-side hook `useActions` can handle.
    return result.toAIStreamResponse();

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 });
  }
}
