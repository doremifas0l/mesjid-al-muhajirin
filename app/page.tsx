// app/page.tsx

import HomeContent from "@/components/home-content";
import { supabase } from "@/lib/supabase/client"; // Pastikan path ini benar

// Definisikan semua tipe data yang diperlukan. Anda bisa memindahkannya ke file terpisah nanti.
type DbEvent = {
  id: string;
  title: string;
  starts_at: string;
  location?: string;
  description?: string;
  image_url?: string;
};

type HomeContentData = {
  site_title: string;
  hero_tag: string;
  announcement: string;
  about_title: string;
  about_body: string;
  about_bullets: string[];
  events_title: string;
  events_subtitle: string;
  youtube_title: string;
  youtube_subtitle: string;
};

type FinanceTransaction = {
  id: string;
  occured_at: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string | null;
};

// Fungsi ini akan berjalan di server untuk mengambil semua data sekaligus
async function getHomePageData() {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : 'http://localhost:3000';

    // Ambil semua data secara paralel untuk performa maksimal
    const [contentRes, imagesRes, eventsRes, financeResult] = await Promise.all([
        fetch(`${baseUrl}/api/homepage/content`, { cache: 'no-store' }),
        fetch(`${baseUrl}/api/homepage/images`, { cache: 'no-store' }),
        fetch(`${baseUrl}/api/events`, { cache: 'no-store' }),
        supabase.from("finance_transactions").select("*").order("occured_at", { ascending: false })
    ]);

    // 1. Proses data Konten
    const contentJson = await contentRes.json();
    const content: HomeContentData = contentJson?.data;

    // 2. Proses data Gambar
    const imagesJson = await imagesRes.json();
    const images: string[] = (imagesJson?.data as any[] || []).map(r => r.url).slice(0, 5);

    // 3. Proses data Acara
    const eventsJson = await eventsRes.json();
    const events: DbEvent[] = eventsJson?.data || [];

    // 4. Proses data Keuangan
    const { data: transactions, error: financeError } = financeResult;
    if (financeError) {
        console.error("Supabase error fetching finance data:", financeError.message);
    }
    const safeTransactions = transactions || [];
    const categories = Array.from(new Set(safeTransactions.map(t => t.category)));

    return {
        content,
        images,
        events,
        financeTransactions: safeTransactions,
        financeCategories: categories
    };
}

// Komponen Page sekarang async
export default async function Page() {
    // Panggil fungsi untuk mendapatkan semua data
    const { 
        content, 
        images, 
        events, 
        financeTransactions, 
        financeCategories 
    } = await getHomePageData();

    return (
        <main>
            {/* Teruskan semua data yang diambil sebagai initial props ke HomeContent */}
            <HomeContent
                initialContent={content}
                initialImages={images}
                initialEvents={events}
                initialFinanceItems={financeTransactions}
                initialFinanceCategories={financeCategories}
            />
        </main>
    );
}
