// components/home-content.tsx

"use client";

import Header from "@/components/header";
import EventCard, { type EventCardInput } from "@/components/event-card";
import ChatBot from "@/components/chat-bot";
import FinancePreview from "@/components/finance-preview";
import FeaturedVideo from "@/components/featured-video";
import HeroSlideshow from "@/components/hero-slideshow";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react"; // Hapus useEffect

// Definisikan atau import tipe data...
type DbEvent = { /* ... */ };
type HomeContentData = { /* ... */ };
type FinanceItem = { /* ... */ };

// Definisikan tipe untuk props yang diterima komponen ini
type HomeContentProps = {
    initialContent: HomeContentData;
    initialImages: string[];
    initialEvents: DbEvent[];
    initialFinanceItems: FinanceItem[];
    initialFinanceCategories: string[];
};

export default function HomeContent({
    initialContent,
    initialImages,
    initialEvents,
    initialFinanceItems,
    initialFinanceCategories
}: HomeContentProps) {
    // Inisialisasi state menggunakan props yang diterima dari server
    const [events, setEvents] = useState<DbEvent[]>(initialEvents);
    const [content, setContent] = useState<HomeContentData>(initialContent);
    const [heroImages, setHeroImages] = useState<string[]>(initialImages);

    // =========================================================
    // HAPUS SELURUH BLOK `useEffect` YANG MENGAMBIL DATA DARI API
    // useEffect(() => { ... }, []); // <-- HAPUS SEMUA INI
    // =========================================================

    // Logika useMemo dan fungsi lainnya tetap tidak berubah
    const upcoming = useMemo(() => {
        const now = Date.now();
        return [...events]
          .filter((e) => {
            const t = new Date((e.starts_at || "").toString().replace(" ", "T")).getTime();
            return Number.isFinite(t) && t >= now - 24 * 60 * 60 * 1000;
          })
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }, [events]);

    function toCard(e: DbEvent): EventCardInput {
        return {
          id: e.id,
          title: e.title,
          starts_at: e.starts_at,
          location: e.location,
          description: e.description,
          image_url: e.image_url,
        };
    }

    // Pastikan untuk menangani jika 'content' adalah null/undefined saat render pertama
    if (!content) {
        return <div>Memuat konten...</div>; // Atau tampilkan skeleton loader
    }

    return (
        <div className="min-h-screen bg-white">
            <Header />
            {/* ... bagian <section> hero ... */}
            <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-16">
              {/* ... JSX ... */}
            </section>
            
            {/* ... bagian <section> events ... */}
            <section id="events" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
              {/* ... JSX ... */}
            </section>
            
            {/* Panggil FinancePreview DAN TERUSKAN PROPS-NYA */}
            <FinancePreview 
                initialItems={initialFinanceItems} 
                initialCategories={initialFinanceCategories}
            />

            {/* ... sisa JSX Anda (youtube, chat, footer) tidak perlu diubah ... */}
            <section id="youtube" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
              {/* ... JSX ... */}
            </section>
            <section id="chat" className="mx-auto max-w-6xl px-4 pb-16">
              {/* ... JSX ... */}
            </section>
            <footer className="border-t bg-white">
              {/* ... JSX ... */}
            </footer>
        </div>
    );
}
