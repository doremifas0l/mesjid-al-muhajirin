// components/home-content.tsx
"use client"

import Header from "@/components/header"
import EventCard, { type EventCardInput } from "@/components/event-card"
import ChatBot from "@/components/chat-bot"
import FinancePreview from "@/components/finance-preview"
import FeaturedVideo from "@/components/featured-video"
import HeroSlideshow from "@/components/hero-slideshow"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import ArticleCard, { type ArticleCardInput } from './article-card' // <-- IMPORT THE NEW ArticleCard

// Type definitions (DbEvent, HomeContent) are unchanged
type DbEvent = {
  id: string
  title: string
  starts_at: string
  location?: string
  description?: string
  image_url?: string
}

type HomeContent = {
  site_title: string
  hero_tag: string
  announcement: string
  about_title: string
  about_body: string
  about_bullets: string[]
  events_title: string
  events_subtitle: string
  youtube_title: string
  youtube_subtitle: string
}
// The article type now matches the ArticleCardInput
type Article = ArticleCardInput;

export default function HomeContent() {
  const [events, setEvents] = useState<DbEvent[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [content, setContent] = useState<HomeContent>({
    site_title: "Mesjid Al-Muhajirin Sarimas",
    hero_tag: "AI-Powered Community Hub",
    announcement: "Selamat datang di Mesjid Al-Muhajirin Sarimas. Mari makmurkan masjid bersama!",
    about_title: "Tentang Masjid",
    about_body:
      "Mesjid Al-Muhajirin Sarimas adalah pusat kegiatan ibadah dan sosial masyarakat Sarimas. Dengan bantuan AI, kami berupaya menghadirkan informasi kegiatan, pelayanan, dan interaksi yang lebih cepat dan mudah.",
    about_bullets: [
      "Informasi jadwal shalat dan kajian",
      "Pendaftaran kelas dan kegiatan sosial",
      "Chatbot untuk tanya jawab cepat",
    ],
    events_title: "Kegiatan Mendatang",
    events_subtitle: "Jangan lewatkan agenda komunitas kita.",
    youtube_title: "YouTube",
    youtube_subtitle: "Tonton ceramah dan kegiatan terbaru.",
  })
  const [heroImages, setHeroImages] = useState<string[]>([])

  useEffect(() => {
    ;(async () => {
      // --- This data fetching part remains the same ---
      // Content
      const cRes = await fetch("/api/homepage/content")
      if (cRes.ok) { /* ... setContent logic ... */ }
      // Images
      const iRes = await fetch("/api/homepage/images")
      if (iRes.ok) { /* ... setHeroImages logic ... */ }
      // Events
      const eRes = await fetch("/api/events")
      if (eRes.ok) {
        const j = await eRes.json()
        setEvents((j?.data as DbEvent[]) || [])
      }
      // Articles (fetch up to 6 for a nice grid)
      const aRes = await fetch("/api/articles?limit=6"); // Fetch 6 articles for a 2x3 grid
      if (aRes.ok) {
        const j = await aRes.json();
        setArticles((j?.data as Article[]) || []);
      }
    })()
  }, [])

  // Event processing logic is unchanged
  const upcoming = useMemo(() => { /* ... */ return [] }, [events])
  function toCard(e: DbEvent): EventCardInput { /* ... */ return e as any }


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section remains unchanged */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-16">
          {/* ... */}
      </section>

      {/* Events Section remains unchanged */}
      <section id="events" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          {/* ... */}
      </section>

      {/* --- MODIFIED ARTICLES SECTION --- */}
      <section id="articles" className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Artikel & Pengumuman</h2>
            <p className="mt-2 text-lg text-neutral-600">Baca berita dan informasi terbaru dari kami.</p>
          </div>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-neutral-600">
                Belum ada artikel yang dipublikasikan.
            </p>
          )}
        </div>
      </section>

      <FinancePreview />

      {/* YouTube Section remains unchanged */}
      <section id="youtube" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          {/* ... */}
      </section>

      {/* Chat Section remains unchanged */}
      <section id="chat" className="mx-auto max-w-6xl px-4 pb-16">
          {/* ... */}
      </section>

      {/* Footer remains unchanged */}
      <footer className="border-t bg-white">
          {/* ... */}
      </footer>
    </div>
  )
}