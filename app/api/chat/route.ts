import { google } from "@ai-sdk/google"
import { streamText, type UIMessage, convertToModelMessages } from "ai"
import { createClient } from "@supabase/supabase-js"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

type FinanceRow = {
  id?: string
  amount?: number | string
  type?: "income" | "expense" | string | null
  category?: string | null
  note?: string | null
  date?: string | null
  created_at?: string | null
}

type EventRow = {
  id?: string
  title?: string | null
  location?: string | null
  description?: string | null
  image_url?: string | null
  imageUrl?: string | null
  starts_at?: string | null
  date?: string | null
  time?: string | null
}

type NoteRow = {
  id?: string
  title?: string | null
  body?: string | null
  created_at?: string | null
}

function safeDate(input?: string | null): Date | null {
  if (!input) return null
  const normalized = input.includes("T") ? input : input.replace(" ", "T")
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}
function num(x: number | string | undefined | null): number {
  if (x == null) return 0
  const n = typeof x === "number" ? x : Number.parseFloat(String(x).replace(/[^0-9.-]/g, ""))
  return isNaN(n) ? 0 : n
}
function sameMonth(d: Date, y: number, m: number) {
  return d.getFullYear() === y && d.getMonth() === m
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }), { status: 401 })
    }

    // Optional Supabase context (finance, events, notes)
    const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY
    const supabase = hasSupabase ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!) : null

    let finance: FinanceRow[] = []
    let events: EventRow[] = []
    let notes: NoteRow[] = []

    if (supabase) {
      const [{ data: f }, { data: e }, { data: n }] = await Promise.all([
        supabase.from("finance_transactions").select("*").limit(1000),
        supabase.from("events").select("*").limit(300),
        supabase.from("notes").select("*").limit(300),
      ])
      finance = (f as FinanceRow[]) || []
      events = (e as EventRow[]) || []
      notes = (n as NoteRow[]) || []
    }

    // Compute monthly finance metrics
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    type Totals = { income: number; expense: number }
    const monthlyTotalsByCategory: Record<string, Totals> = {}
    const financeThisMonth: FinanceRow[] = []

    for (const row of finance) {
      const d = safeDate(row.date || row.created_at)
      if (!d) continue
      if (!sameMonth(d, year, month)) continue
      financeThisMonth.push(row)
      const cat = (row.category || "Lainnya").trim()
      if (!monthlyTotalsByCategory[cat]) monthlyTotalsByCategory[cat] = { income: 0, expense: 0 }
      const amount = num(row.amount)
      const t = (row.type || "").toLowerCase()
      if (t === "income") monthlyTotalsByCategory[cat].income += amount
      else monthlyTotalsByCategory[cat].expense += amount
    }

    // Total pemasukan infaq bulan ini
    let totalInfaqThisMonth = 0
    for (const [cat, totals] of Object.entries(monthlyTotalsByCategory)) {
      if (cat.toLowerCase().includes("infaq") || cat.toLowerCase().includes("infak")) {
        totalInfaqThisMonth += totals.income
      }
    }

    // Pengeluaran terbesar bulan ini
    let biggestExpenseThisMonth: { amount: number; category: string; date: string; note?: string | null } | null = null
    for (const row of financeThisMonth) {
      const t = (row.type || "").toLowerCase()
      if (t !== "expense") continue
      const amount = num(row.amount)
      if (!biggestExpenseThisMonth || amount > biggestExpenseThisMonth.amount) {
        biggestExpenseThisMonth = {
          amount,
          category: (row.category || "Lainnya").trim(),
          date: safeDate(row.date || row.created_at)?.toISOString() || new Date().toISOString(),
          note: row.note,
        }
      }
    }

    // Normalize events/notes
    const normalizedEvents = events
      .map((e) => {
        const starts = safeDate(e.starts_at || (e.date && e.time ? `${e.date}T${e.time}` : e.date || null))
        return {
          id: e.id,
          title: e.title || "",
          location: e.location || "",
          description: e.description || "",
          image_url: e.image_url || e.imageUrl || "",
          starts_at: starts ? starts.toISOString() : null,
        }
      })
      .filter((e) => e.title)
      .sort((a, b) => {
        const ad = a.starts_at ? new Date(a.starts_at).getTime() : Number.MAX_SAFE_INTEGER
        const bd = b.starts_at ? new Date(b.starts_at).getTime() : Number.MAX_SAFE_INTEGER
        return ad - bd
      })
      .slice(0, 50)

    const normalizedNotes = notes
      .map((n) => ({
        id: n.id,
        title: n.title || "",
        body: (n.body || "").slice(0, 1000),
        created_at: safeDate(n.created_at || null)?.toISOString() || null,
      }))
      .slice(0, 50)

    const context = {
      meta: { generated_at: new Date().toISOString(), month: month + 1, year },
      finance: {
        monthlyTotalsByCategory,
        totalInfaqThisMonth,
        biggestExpenseThisMonth,
        countThisMonth: financeThisMonth.length,
      },
      events: normalizedEvents,
      notes: normalizedNotes,
      instructions: {
        language: "id",
        rules: [
          "Jawab HANYA berdasarkan data di konteks (finance, kegiatan, catatan) dan fakta keagamaan yang tidak kontroversial.",
          "Jika data yang diminta tidak ada, jawab singkat bahwa data tidak tersedia.",
          "Tolak topik kontroversial/politik/sektarian/spekulatif.",
          "Jawab ringkas dan jelas dalam Bahasa Indonesia.",
        ],
      },
    }

    const system = [
      "Anda adalah asisten untuk Mesjid Al-Muhajirin Sarimas.",
      "Ikuti aturan berikut:",
      "- Hanya jawab berdasarkan 'KONTEKS' di bawah dan informasi keagamaan faktual yang tidak kontroversial.",
      "- Tolak pertanyaan kontroversial, politik, sektarian, perdebatan, atau di luar cakupan data.",
      "- Jika data tidak tersedia, sampaikan dengan singkat dan sarankan memeriksa sumber resmi setempat.",
      "- Jawab ringkas dalam Bahasa Indonesia.",
      "",
      "KONTEKS JSON:",
      JSON.stringify(context, null, 2),
    ].join("\n")

    // Important: return UI message stream for @ai-sdk/react [^3][^4]
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 })
  }
}
