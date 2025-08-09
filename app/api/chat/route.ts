import { google } from "@ai-sdk/google"
// We need `generateText` for the simple triage call
import { generateText, streamText, type UIMessage, convertToModelMessages } from "ai" 
import { createClient } from "@supabase/supabase-js"

// ... (keep all your type definitions and helper functions like safeDate, num, etc.)

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }), { status: 401 })
    }
    // Optional Supabase context (finance, events, notes)
    const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY
    const supabase = hasSupabase ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!) : null

    // --- NEW: Step 1: AI Triage Call ---
    const lastUserMessage = messages[messages.length - 1].content;
    let requiredData: string[] = [];

    if (supabase) {
        const { text: triageResult } = await generateText({
            model: google('gemini-1.5-flash'), // Use a fast model for triage
            system: "You are a data-fetching router. Based on the user's query, respond with a comma-separated list of data types they might need. The only options are: 'finance', 'events', 'notes'. If the query is a general greeting or question, respond with 'none'.",
            prompt: `User query: "${lastUserMessage}"`,
        });
        requiredData = triageResult.split(',').map(s => s.trim());
    }
    
    // --- MODIFIED: Step 2: Conditional Data Fetching ---
    let finance: FinanceRow[] = []
    let events: EventRow[] = []
    let notes: NoteRow[] = []

    if (supabase) {
        const fetchPromises = [];
        if (requiredData.includes('finance')) {
            fetchPromises.push(supabase.from("finance_transactions").select("*").limit(1000).then(res => finance = (res.data as FinanceRow[]) || []));
        }
        if (requiredData.includes('events')) {
            fetchPromises.push(supabase.from("events").select("*").limit(300).then(res => events = (res.data as EventRow[]) || []));
        }
        if (requiredData.includes('notes')) {
            fetchPromises.push(supabase.from("notes").select("*").limit(300).then(res => notes = (res.data as NoteRow[]) || []));
        }
        await Promise.all(fetchPromises);
    }
    
    // --- Step 3: Process Data and Build Context (largely the same as your original code) ---
    // This part of the code remains the same, but it now operates on a smaller,
    // more relevant dataset.
    
    const context: any = { // Use 'any' for simplicity as context is now dynamic
      meta: { generated_at: new Date().toISOString() },
      instructions: {
        language: "id",
        rules: [
          "Jawab HANYA berdasarkan data di konteks dan fakta keagamaan yang tidak kontroversial.",
          "Jika data yang diminta tidak ada, jawab singkat bahwa data tidak tersedia.",
          "Jawab ringkas dan jelas dalam Bahasa Indonesia.",
        ],
      },
    };

    // Conditionally add data to the context
    if (finance.length > 0) {
        // Run your finance processing logic here (biggest expense, monthly totals, etc.)
        // and add it to context.finance
        // For brevity, I'm omitting the full processing block from your original code
        context.finance = { message: `Found ${finance.length} finance records.`, details: finance.slice(0, 50) }; // Example
    }
    if (events.length > 0) {
        // Run your event normalization logic here
        // and add it to context.events
        context.events = { message: `Found ${events.length} events.`, details: events.slice(0, 50) }; // Example
    }
     if (notes.length > 0) {
        // Run your notes normalization logic here
        // and add it to context.notes
        context.notes = { message: `Found ${notes.length} notes.`, details: notes.slice(0, 50) }; // Example
    }


    // --- Step 4: Main Answering Call (Same as before) ---
    const system = [
      "Anda adalah asisten untuk Mesjid Al-Muhajirin Sarimas.",
      "Ikuti aturan berikut:",
      "- Hanya jawab berdasarkan 'KONTEKS' di bawah dan informasi keagamaan faktual yang tidak kontroversial.",
      "- Jika data tidak tersedia karena tidak relevan dengan pertanyaan, sampaikan dengan singkat.",
      "- Jawab ringkas dalam Bahasa Indonesia.",
      "",
      "KONTEKS JSON:",
      JSON.stringify(context, null, 2),
    ].join("\n")

    const result = streamText({
      model: google("gemini-1.5-flash"),
      system,
      messages: convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 })
  }
}
