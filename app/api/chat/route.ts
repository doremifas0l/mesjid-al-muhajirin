// /app/api/chat/route.ts

import { google } from "@ai-sdk/google";
// MODIFICATION 1: We will import `toAIStream` and remove `StreamingTextResponse`
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
  toAIStream,
} from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// --- No changes in this section ---
// Type Definitions
type FinanceRow = {
  id?: string;
  amount?: number | string;
  type?: "income" | "expense" | string | null;
  category?: string | null;
  note?: string | null;
  date?: string | null;
  created_at?: string | null;
};

// Helper function to safely convert to a number
function num(x: number | string | undefined | null): number {
  if (x == null) return 0;
  const n =
    typeof x === "number"
      ? x
      : Number.parseFloat(String(x).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}
// --- End of no-change section ---

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY
    ) {
      return new Response(JSON.stringify({ error: "Missing API credentials" }), {
        status: 401,
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const tools = {
      getFinancialData: tool({
        description:
          "Get financial data from the database. Can be used to calculate balances, or list incomes and expenses based on various filters.",
        parameters: z.object({
          year: z.number().optional().describe("The year to filter by, e.g., 2024."),
          month: z
            .number()
            .optional()
            .describe("The month number (1-12) to filter by."),
          type: z
            .enum(["income", "expense"])
            .optional()
            .describe("Filter for only income or only expenses."),
          category: z
            .string()
            .optional()
            .describe(
              "Filter by a specific category, e.g., 'Infaq' or 'Operasional'."
            ),
        }),
        execute: async ({ year, month, type, category }) => {
          let query = supabase
            .from("finance_transactions")
            .select("type, amount, category, date, note");
          if (year && month) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query = query
              .gte("date", startDate.toISOString())
              .lte("date", endDate.toISOString());
          }
          if (type) {
            query = query.eq("type", type);
          }
          if (category) {
            query = query.ilike("category", `%${category}%`);
          }
          const { data, error } = await query.limit(500);
          if (error)
            return { toolName: "getFinancialData", result: { error: error.message } };
          return { toolName: "getFinancialData", result: { transactions: data } };
        },
      }),
    };

    const system = `You are a helpful assistant for Mesjid Al-Muhajirin Sarimas.
- Answer user questions by calling the available tools to get the necessary data.
- If the tools provide data, synthesize the answer based on that data.
- If the tools return an error or no data, inform the user that the information could not be found.
- Today's date is ${new Date().toISOString()}.`;

    const result = await streamText({ // using await here is safer with older versions
      model: google("gemini-1.5-flash"),
      system,
      messages: convertToModelMessages(messages),
      tools,
    });

    // MODIFICATION 2: Use the older (v2) syntax to create the stream
    const stream = toAIStream(result);
    return new Response(stream);
    
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request." }),
      { status: 500 }
    );
  }
}
