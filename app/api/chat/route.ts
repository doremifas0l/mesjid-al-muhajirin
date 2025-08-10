// app/api/chat/route.ts
import { google } from "@ai-sdk/google"
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
} from "ai"
import { createClient } from "@supabase/supabase-js"

// Allow streaming responses up to 30 seconds
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
      getFinancialData: tool({
        description:
          "Get financial data from the database. Can be used to calculate balances, or list incomes and expenses based on various filters.",
        // Use plain JSON Schema to ensure the root is an OBJECT for Gemini
        parameters: {
          type: "object",
          properties: {
            year: {
              type: "integer",
              description: "The year to filter by, e.g., 2024.",
            },
            month: {
              type: "integer",
              minimum: 1,
              maximum: 12,
              description: "The month number (1-12) to filter by.",
            },
            type: {
              type: "string",
              enum: ["income", "expense"],
              description: "Filter for only income or only expenses.",
            },
            category: {
              type: "string",
              description:
                "Filter by a specific category, e.g., 'Infaq' or 'Operasional'.",
            },
          },
          additionalProperties: false,
        } as const,
        execute: async ({
          year,
          month,
          type,
          category,
        }: {
          year?: number
          month?: number
          type?: "income" | "expense"
          category?: string
        }) => {
          let query = supabase
            .from("finance_transactions")
            .select("type, amount, category, date, note")

          if (year && month) {
            // Correct month window:
            // month is 1-12; start at UTC first-of-month, end at UTC end-of-month
            const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
            const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
            query = query
              .gte("date", start.toISOString())
              .lte("date", end.toISOString())
          } else if (year && !month) {
            const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
            const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
            query = query
              .gte("date", start.toISOString())
              .lte("date", end.toISOString())
          }

          if (type) query = query.eq("type", type)
          if (category) query = query.ilike("category", `%${category}%`)

          const { data, error } = await query.limit(500)
          if (error) return { error: error.message }
          return { transactions: data }
        },
      }),
    }

    const system = `You are a helpful assistant for Mesjid Al-Muhajirin Sarimas.
- Answer user questions by calling the available tools to get the necessary data.
- If the tools provide data, synthesize the answer based on that data.
- If the tools return an error or no data, inform the user that the information could not be found.
- Today's date is ${new Date().toISOString()}.`

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages), // UIMessage -> ModelMessage
      tools,
    })

    return result.toUIMessageStreamResponse() // correct helper for useChat
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), {
      status: 500,
    })
  }
}
