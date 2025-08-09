import { google } from "@ai-sdk/google";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { createClient } from "@supabase/supabase-js";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type FinanceRow = {
  id?: string;
  amount?: number | string;
  type?: "income" | "expense" | string | null;
  category?: string | null;
  note?: string | null;
  occured_at?: string | null;
  date?: string | null;
  created_at?: string | null;
};

type EventRow = {
  id?: string;
  title?: string | null;
  location?: string | null;
  description?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  starts_at?: string | null;
  date?: string | null;
  time?: string | null;
};

type NoteRow = {
  id?: string;
  title?: string | null;
  body?: string | null;
  created_at?: string | null;
};

function safeDate(input?: string | null): Date | null {
  if (!input) return null;
  const normalized = input.includes("T") ? input : input.replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}
function num(x: number | string | undefined | null): number {
  if (x == null) return 0;
  const n = typeof x === "number" ? x : Number.parseFloat(String(x).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}
function sameMonth(d: Date, y: number, m: number) {
  return d.getFullYear() === y && d.getMonth() === m;
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }), { status: 401 });
    }

    const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
    const supabase = hasSupabase ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!) : null;

    let finance: FinanceRow[] = [];
    let events: EventRow[] = [];
    let notes: NoteRow[] = [];

    if (supabase) {
      const [{ data: f }, { data: e }, { data: n }] = await Promise.all([
        supabase.from("finance_transactions").select("*").limit(1000),
        supabase.from("events").select("*").limit(300),
        supabase.from("notes").select("*").limit(300),
      ]);
      finance = (f as FinanceRow[]) || [];
      events = (e as EventRow[]) || [];
      notes = (n as NoteRow[]) || [];
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    type Totals = { income: number; expense: number };
    const monthlyTotalsByCategory: Record<string, Totals> = {};
    const financeThisMonth: FinanceRow[] = [];

    for (const row of finance) {
      const d = safeDate(row.occured_at || row.date || row.created_at);

      if (!d || !sameMonth(d, year, month)) continue;
      financeThisMonth.push(row);
      const cat = (row.category || "Lainnya").trim();
      if (!monthlyTotalsByCategory[cat]) monthlyTotalsByCategory[cat] = { income: 0, expense: 0 };
      const amount = num(row.amount);
      if ((row.type || "").toLowerCase() === "income") monthlyTotalsByCategory[cat].income += amount;
      else monthlyTotalsByCategory[cat].expense += amount;
    }

    let totalInfaqThisMonth = 0;
    for (const [cat, totals] of Object.entries(monthlyTotalsByCategory)) {
      if (cat.toLowerCase().includes("infaq") || cat.toLowerCase().includes("infak")) {
        totalInfaqThisMonth += totals.income;
      }
    }

    let biggestExpenseThisMonth: { amount: number; category: string; date: string; note?: string | null } | null = null;
    for (const row of financeThisMonth) {
      if ((row.type || "").toLowerCase() !== "expense") continue;
      const amount = num(row.amount);
      if (!biggestExpenseThisMonth || amount > biggestExpenseThisMonth.amount) {
        biggestExpenseThisMonth = {
          amount,
          category: (row.category || "Lainnya").trim(),
          date: safeDate(row.occured_at || row.date || row.created_at)?.toISOString() || new Date().toISOString(),
          note: row.note,
        };
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allNormalizedEvents = events
      .map((e) => {
        const starts = safeDate(e.starts_at || (e.date && e.time ? `${e.date}T${e.time}` : e.date || null));
        return {
          id: e.id,
          title: e.title || "",
          location: e.location || "",
          description: (e.description || "").slice(0, 200),
          starts_at: starts ? starts.toISOString() : null,
        };
      })
      .filter((e) => e.title && e.starts_at);

    const upcomingEvents = allNormalizedEvents
      .filter((e) => new Date(e.starts_at!) >= today)
      .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
      .slice(0, 25);

    const recentPastEvents = allNormalizedEvents
      .filter((e) => new Date(e.starts_at!) < today)
      .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime())
      .slice(0, 5);

    const normalizedNotes = notes
      .map((n) => ({
        id: n.id,
        title: n.title || "",
        body: (n.body || "").slice(0, 1000),
        created_at: safeDate(n.created_at || null)?.toISOString() || null,
      }))
      .slice(0, 50);

    const context = {
      meta: { generated_at: new Date().toISOString(), month: month + 1, year },
      finance: {
        monthlyTotalsByCategory,
        totalInfaqThisMonth,
        biggestExpenseThisMonth,
        countThisMonth: financeThisMonth.length,
      },
      events: {
        upcoming: upcomingEvents,
        recent_past: recentPastEvents,
      },
      notes: normalizedNotes,
    };

    const system = `Anda adalah asisten AI untuk Masjid Al-Muhajirin Sarimas. Tugas Anda adalah menjawab pertanyaan jamaah berdasarkan KONTEKS JSON di bawah.

ATURAN PENTING:
1. Jawaban WAJIB berdasarkan data di \`KONTEKS JSON\`. Jangan berasumsi atau mengarang.
2. Selalu jawab dalam Bahasa Indonesia yang ringkas, sopan, dan jelas.
3. Jika data yang diminta tidak ada, sampaikan bahwa data tidak tersedia.
4. Tolak dengan sopan untuk menjawab topik kontroversial, politik, atau perdebatan.

CARA MENGGUNAKAN DATA KEGIATAN:
- Data kegiatan ada dua: \`events.upcoming\` (akan datang) dan \`events.recent_past\` (lampau terkini).
- Jika ditanya tentang kegiatan mendatang, UTAMAKAN data dari \`events.upcoming\`.
- Jika \`events.upcoming\` kosong, Anda BOLEH memberitahu bahwa belum ada jadwal baru dan memberikan contoh kegiatan dari \`events.recent_past\` sebagai referensi.

--- KONTEKS JSON ---
${JSON.stringify(context, null, 2)}`;

    const result = streamText({
      model: google("models/gemini-1.5-flash-latest"),
      system,
      messages: convertToModelMessages(messages),
    });
    return result.toUIMessageStreamResponse();
    
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to process chat request." }), { status: 500 });
  }
}
