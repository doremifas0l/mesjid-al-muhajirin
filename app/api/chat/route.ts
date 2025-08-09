import { google } from "@ai-sdk/google"
import { streamText, tool, type UIMessage, convertToModelMessages } from "ai" 
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

// Make sure your type definitions are here
type FinanceRow = {
  id?: string;
  amount?: number | string;
  type?: "income" | "expense" | string | null;
  category?: string | null;
  note?: string | null;
  date?: string | null;
  created_at?: string | null;
}

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
          
          if (error) {
            console.error("Supabase query error:", error);
            return { toolName: 'getFinancialData', result: { error: error.message }};
          }
          return { toolName: 'getFinancialData', result: { transactions: data }};
        },
      }),
    };

    const system = `You are a helpful assistant for Mesjid Al-Muhajirin Sarimas.
- Answer user questions by calling the available tools to get the necessary data.
- If the tools provide data, synthesize the answer based on that data.
- If the tools return an error or no data, inform the user that the information could not be found.
- Today's date is ${new Date().toISOString()}.`;

    // THIS IS THE CRITICAL PART.
    // There is NO `await` on the line below.
    const result = streamText({
      model: google('gemini-1.5-flash'),
      system,
      messages: convertToModelMessages(messages),
      tools,
    });
    
    // This line returns the stream handler immediately.
    return result.toAIStreamResponse();

  } catch (err) {
    // Log the full error to the server console for better debugging.
    console.error("[API Chat Error]", err);
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 });
  }
}
