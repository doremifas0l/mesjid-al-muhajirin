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

export default function HomeContent() {
  const [events, setEvents] = useState<DbEvent[]>([])
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
      // Content
      const cRes = await fetch("/api/homepage/content")
      if (cRes.ok) {
        const j = await cRes.json()
        const d = j?.data
        if (d) {
          setContent((prev) => ({
            ...prev,
            site_title: d.site_title ?? prev.site_title,
            hero_tag: d.hero_tag ?? prev.hero_tag,
            announcement: d.announcement ?? prev.announcement,
            about_title: d.about_title ?? prev.about_title,
            about_body: d.about_body ?? prev.about_body,
            about_bullets: Array.isArray(d.about_bullets) ? d.about_bullets : prev.about_bullets,
            events_title: d.events_title ?? prev.events_title,
            events_subtitle: d.events_subtitle ?? prev.events_subtitle,
            youtube_title: d.youtube_title ?? prev.youtube_title,
            youtube_subtitle: d.youtube_subtitle ?? prev.youtube_subtitle,
          }))
        }
      }
      // Images
      const iRes = await fetch("/api/homepage/images")
      if (iRes.ok) {
        const j = await iRes.json()
        const list = (j?.data as any[]) || []
        setHeroImages(list.map((r) => r.url).slice(0, 5))
      }
      // Events
      const eRes = await fetch("/api/events")
      if (eRes.ok) {
        const j = await eRes.json()
        setEvents((j?.data as DbEvent[]) || [])
      }
    })()
  }, [])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter((e) => {
        // Safe filter even if starts_at was malformed
        const t = new Date((e.starts_at || "").toString().replace(" ", "T")).getTime()
        return Number.isFinite(t) && t >= now - 24 * 60 * 60 * 1000
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }, [events])

  function toCard(e: DbEvent): EventCardInput {
    return {
      id: e.id,
      title: e.title,
      starts_at: e.starts_at,
      location: e.location,
      description: e.description,
      image_url: e.image_url,
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-16">
        <div className="grid items-center gap-8 sm:gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {content.hero_tag}
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900">
              {content.site_title}
            </h1>
            <p className="mt-4 text-neutral-600">{content.announcement}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => (window.location.href = "#events")} className="bg-neutral-900 hover:bg-black">
                Lihat Kegiatan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "#chat")}>
                Tanyakan ke Chatbot
              </Button>
            </div>
          </div>
          <HeroSlideshow images={heroImages} />
        </div>
      </section>

      <section id="events" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">{content.events_title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{content.events_subtitle}</p>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-6 text-neutral-600">
            Belum ada kegiatan mendatang. Silakan tambahkan melalui Dashboard Admin.
          </p>
        ) : upcoming.length <= 2 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((ev) => (
              <EventCard key={ev.id} event={toCard(ev)} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2">
              {upcoming.map((ev) => (
                <div key={ev.id} className="min-w-[280px] max-w-[360px] snap-start">
                  <EventCard event={toCard(ev)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <FinancePreview />

      <section id="youtube" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">{content.youtube_title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{content.youtube_subtitle}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open("https://www.youtube.com/@almuhajirinsarimas/videos", "_blank")}
          >
            Kunjungi Channel
          </Button>
        </div>
        <div className="mt-6">
          <FeaturedVideo />
        </div>
      </section>

      <section id="chat" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-xl font-semibold text-neutral-900">{content.about_title}</h3>
            <p className="mt-2 text-neutral-600">{content.about_body}</p>
            {content.about_bullets.length > 0 && (
              <ul className="mt-4 list-disc pl-5 text-neutral-600">
                {content.about_bullets.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>
          <ChatBot />
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-600">
          {"© "}
          <span className="font-medium text-neutral-900">Mesjid Al-Muhajirin Sarimas</span>
          {" — Chatbot oleh AI SDK dengan model Gemini."}
        </div>
      </footer>
    </div>
  )
}
