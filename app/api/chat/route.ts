import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages, type CoreMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { NextResponse } from "next/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Pastikan variabel environment ada
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL or Anon Key is not defined in environment variables");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- TOOL 1: FUNGSI UNTUK MENDAPATKAN RINGKASAN KEUANGAN ---
async function getFinancialSummary({ year, month, day }: { year?: number; month?: number; day?: number }) {
  console.log(`Executing getFinancialSummary with: year=${year}, month=${month}, day=${day}`);
  
  let query = supabase.from("finance_transactions").select("amount, type, occured_at");

  if (year) {
    const startDate = new Date(year, month ? month - 1 : 0, day || 1);
    const endDate = new Date(
      day ? year : year + (month ? 0 : 1),
      day ? month! - 1 : (month || 12),
      day ? day + 1 : 1
    );
    query = query.gte('occured_at', startDate.toISOString()).lt('occured_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase query error (finance):", error);
    return { error: "Failed to retrieve financial data from database." };
  }
  if (!data || data.length === 0) {
    return { summary: "No transaction data found for the specified period." };
  }
  
  let totalIncome = 0;
  let totalExpense = 0;
  for (const transaction of data) {
    const amount = Number(transaction.amount) || 0;
    if (transaction.type === 'income') totalIncome += amount;
    else if (transaction.type === 'expense') totalExpense += amount;
  }

  return { period: { year, month, day }, totalIncome, totalExpense, netBalance: totalIncome - totalExpense, transactionCount: data.length };
}

// --- TOOL 2: FUNGSI UNTUK MENDAPATKAN DAFTAR KEGIATAN ---
async function getEvents({ startDate, endDate, limit = 10 }: { startDate: string; endDate: string; limit?: number }) {
  console.log(`Executing getEvents with: startDate=${startDate}, endDate=${endDate}, limit=${limit}`);

  const { data, error } = await supabase
    .from("events")
    .select("title, description, location, starts_at")
    .gte("starts_at", startDate)
    .lte("starts_at", endDate)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Supabase query error (events):", error);
    return { error: "Failed to retrieve event data from database." };
  }
  if (!data || data.length === 0) {
    return { summary: "No events found for the specified date range." };
  }
  
  // Format data agar lebih mudah dibaca oleh AI
  return data.map(event => ({
      title: event.title,
      location: event.location,
      description: event.description,
      schedule: new Date(event.starts_at).toLocaleString('id-ID', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
  }));
}

// --- MAIN API HANDLER ---
export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }), { status: 401 });
    }

    const result = await streamText({
      model: google("models/gemini-1.5-flash-latest"),
      system: `You are a helpful and friendly assistant for the Al-Muhajirin Sarimas Mosque.
- You must always answer in Indonesian.
- You can answer questions about the mosque's finances and events by using the available tools.
- For dates, the current date is ${new Date().toISOString()}. Use this as a reference to calculate date ranges for user queries like "next week", "this month", "yesterday", etc.
- When a user asks a vague question (e.g., "ada kegiatan apa?"), assume they are asking about upcoming events for the next 7 days.
- If a tool returns no data, inform the user clearly that no data was found for that period.
- Do not answer controversial, political, or sectarian topics.`,
      messages: convertToModelMessages(messages),
      
      tools: {
        // ALAT UNTUK KEUANGAN
        getFinancialSummary: tool({
          description: `Get a financial summary (income, expense, balance) for a specific period. 
            If the user does not specify a year, use the current year (${new Date().getFullYear()}).`,
          parameters: z.object({
            year: z.number().describe("The year to get the summary for, e.g., 2024."),
            month: z.number().optional().describe("The month number (1-12) to get the summary for."),
            day: z.number().optional().describe("The day of the month to get the summary for."),
          }),
          execute: async ({ year, month, day }) => getFinancialSummary({ year, month, day }),
        }),

        // ALAT BARU UNTUK KEGIATAN
        getEvents: tool({
          description: `Get a list of mosque events within a specific date range. 
            Use this to answer questions about "kegiatan", "acara", "jadwal", "pengajian", etc.
            You must determine the startDate and endDate from the user's query in YYYY-MM-DD format.`,
          parameters: z.object({
            startDate: z.string().describe("The start date for the event search, in YYYY-MM-DD format."),
            endDate: z.string().describe("The end date for the event search, in YYYY-MM-DD format."),
            limit: z.number().optional().describe("Maximum number of events to return. Defaults to 10."),
          }),
          execute: async ({ startDate, endDate, limit }) => getEvents({ startDate, endDate, limit }),
        }),
      },
    });

    return result.toAIStreamResponse();

  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred." }, { status: 500 });
  }
}
