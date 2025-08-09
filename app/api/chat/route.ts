import { google } from "@ai-sdk/google"
import { generateText, streamText, type UIMessage, convertToModelMessages } from "ai" 
import { createClient } from "@supabase/supabase-js"

// ... (keep all your type definitions and helper functions like safeDate, num, etc.)

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return new Response(JSON.stringify({ error: "Missing API credentials" }), { status: 401 })
    }
    
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const lastUserMessage = messages[messages.length - 1].content;
    
    // Step 1: AI Triage Call
    const { text: triageResult } = await generateText({
        model: google('gemini-1.5-flash'),
        system: "You are a data-fetching router. Based on the user's query, respond with a comma-separated list of data types they might need. The only options are: 'finance', 'events', 'notes'. If the query is a general greeting or question, respond with 'none'. For questions about 'saldo' or 'balance', respond with 'finance'.",
        prompt: `User query: "${lastUserMessage}"`,
    });
    const requiredData = triageResult.split(',').map(s => s.trim());

    // Step 2: Conditional Data Fetching
    let finance: FinanceRow[] = []
    // We only need to run the complex logic if 'finance' is requested
    if (requiredData.includes('finance')) {
        const { data } = await supabase.from("finance_transactions").select("*").limit(2000); // Fetch all transactions for balance
        finance = (data as FinanceRow[]) || [];
    }
    
    // Step 3: Process Data and Build Context
    const context: any = {
      meta: { generated_at: new Date().toISOString() },
      // ... (instructions remain the same)
    };

    // --- NEW: Check if finance data was fetched and calculate the balance ---
    if (finance.length > 0) {
        let totalIncome = 0;
        let totalExpense = 0;

        for (const row of finance) {
            const amount = num(row.amount); // Use our safe number function
            if ((row.type || "").toLowerCase() === 'income') {
                totalIncome += amount;
            } else if ((row.type || "").toLowerCase() === 'expense') {
                totalExpense += amount;
            }
        }
        
        const currentBalance = totalIncome - totalExpense;

        // Add the calculated balance to the context!
        context.finance = {
            totalIncome,
            totalExpense,
            currentBalance, // This is the crucial field the AI was missing
            transactionCount: finance.length,
        };
    }
    // Note: You can still add event/note fetching logic here if needed

    // Step 4: Main Answering Call
    const system = [
      "Anda adalah asisten untuk Mesjid Al-Muhajirin Sarimas.",
      "Jawab HANYA berdasarkan 'KONTEKS' JSON di bawah.",
      "Jika data tidak tersedia, sampaikan dengan singkat.",
      "Jawab ringkas dalam Bahasa Indonesia.",
      // --- NEW: Add a specific instruction for 'saldo' ---
      "Jika ditanya 'saldo', gunakan field 'currentBalance' dari konteks finance.",
      "",
      "KONTEKS JSON:",
      JSON.stringify(context, null, 2),
    ].join("\n")

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()

  } catch (err) {
    console.error(err); // Log the actual error for debugging
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 })
  }
}```

With this change, when you now ask "berapa saldo", the context provided to the AI will look something like this:

```json
{
  "meta": { ... },
  "finance": {
    "totalIncome": 50000000,
    "totalExpense": 15000000,
    "currentBalance": 35000000,
    "transactionCount": 150
  }
}
