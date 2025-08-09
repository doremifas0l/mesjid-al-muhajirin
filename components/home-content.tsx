"use client"

import Header from "@/components/header"
import EventCard, { type EventItem } from "@/components/event-card"
import ChatBot from "@/components/chat-bot"
import FinancePreview from "@/components/finance-preview"
import FeaturedVideo from "@/components/featured-video"
import EventSlider from "@/components/event-slider"
import HeroSlideshow from "@/components/hero-slideshow"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

const seedEvents: EventItem[] = [
  {
    id: "seed-1",
    title: "Kajian Subuh: Tafsir Juz Amma",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    time: "05:30",
    location: "Mesjid Al Muhajirin",
    description: "Kajian rutin membahas tafsir Juz Amma, terbuka untuk umum.",
    imageUrl: "/masjid-kajian-subuh-talk.png",
  },
  {
    id: "seed-2",
    title: "Kelas Tahfidz Anak",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    time: "16:00",
    location: "Mesjid Al Muhajirin",
    description: "Program hafalan Al-Qur'an untuk anak usia 7-12 tahun.",
    imageUrl: "/kids-quran-class.png",
  },
]

const HERO_KEY = "masjid_hero_images"
const LEGACY_HERO_KEY = "masjid_hero_image"
const DEFAULT_VIDEO = "https://www.youtube.com/watch?v=oJyWJ8d4TUs"

const CONTENT_KEY = "masjid_home_content"
type HomeContent = {
  siteTitle: string
  heroTag: string
  announcement: string
  aboutTitle: string
  aboutBody: string
  aboutBullets: string[]
  eventsTitle: string
  eventsSubtitle: string
  youtubeTitle: string
  youtubeSubtitle: string
}
const defaultContent: HomeContent = {
  siteTitle: "Mesjid Al-Muhajirin Sarimas",
  heroTag: "AI-Powered Community Hub",
  announcement: "Selamat datang di Mesjid Al-Muhajirin Sarimas. Mari makmurkan masjid bersama!",
  aboutTitle: "Tentang Masjid",
  aboutBody:
    "Mesjid Al-Muhajirin Sarimas adalah pusat kegiatan ibadah dan sosial masyarakat Sarimas. Dengan bantuan AI, kami berupaya menghadirkan informasi kegiatan, pelayanan, dan interaksi yang lebih cepat dan mudah.",
  aboutBullets: [
    "Informasi jadwal shalat dan kajian",
    "Pendaftaran kelas dan kegiatan sosial",
    "Chatbot untuk tanya jawab cepat",
  ],
  eventsTitle: "Kegiatan Mendatang",
  eventsSubtitle: "Jangan lewatkan agenda komunitas kita.",
  youtubeTitle: "YouTube",
  youtubeSubtitle: "Tonton ceramah dan kegiatan terbaru.",
}

export default function HomeContent() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [content, setContent] = useState<HomeContent>(defaultContent)
  const [heroImages, setHeroImages] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return

    // Events
    const stored = localStorage.getItem("masjid_events")
    if (!stored) {
      localStorage.setItem("masjid_events", JSON.stringify(seedEvents))
      setEvents(seedEvents)
    } else {
      try {
        const parsed: EventItem[] = JSON.parse(stored)
        setEvents(parsed)
      } catch {
        setEvents(seedEvents)
      }
    }

    // Announcement
    const rawContent = localStorage.getItem(CONTENT_KEY)
    if (rawContent) {
      try {
        const parsed = JSON.parse(rawContent) as Partial<HomeContent>
        setContent({ ...defaultContent, ...parsed })
      } catch {
        const ann = localStorage.getItem("masjid_announcement")
        setContent({
          ...defaultContent,
          announcement: ann && ann.trim().length > 0 ? ann : defaultContent.announcement,
        })
      }
    } else {
      const ann = localStorage.getItem("masjid_announcement")
      setContent({ ...defaultContent, announcement: ann && ann.trim().length > 0 ? ann : defaultContent.announcement })
    }

    // Slideshow images (migrate from legacy single hero if present)
    const imgs = localStorage.getItem(HERO_KEY)
    if (imgs) {
      try {
        const parsed = JSON.parse(imgs) as string[]
        setHeroImages(Array.isArray(parsed) ? parsed.slice(0, 5) : [])
      } catch {
        setHeroImages([])
      }
    } else {
      const legacy = localStorage.getItem(LEGACY_HERO_KEY)
      if (legacy) {
        try {
          const legacyVal = legacy.trim()
          if (legacyVal) {
            setHeroImages([legacyVal])
            localStorage.setItem(HERO_KEY, JSON.stringify([legacyVal]))
          }
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter((e) => new Date(e.date).getTime() >= now - 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [events])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-16">
        <div className="grid items-center gap-8 sm:gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {content.heroTag}
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900">
              {content.siteTitle}
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
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">{content.eventsTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">{content.eventsSubtitle}</p>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-6 text-neutral-600">
            Belum ada kegiatan mendatang. Silakan tambahkan melalui Dashboard Admin.
          </p>
        ) : upcoming.length <= 2 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EventSlider events={upcoming} />
          </div>
        )}
      </section>

      <FinancePreview />

      <section id="youtube" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">{content.youtubeTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">{content.youtubeSubtitle}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open("https://www.youtube.com/@almuhajirinsarimas/videos", "_blank")}
          >
            Kunjungi Channel
          </Button>
        </div>
        <div className="mt-6">
          <FeaturedVideo channelHandle="@almuhajirinsarimas" defaultVideoUrl={DEFAULT_VIDEO} />
        </div>
      </section>

      <section id="chat" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-xl font-semibold text-neutral-900">{content.aboutTitle}</h3>
            <p className="mt-2 text-neutral-600">{content.aboutBody}</p>
            {content.aboutBullets.length > 0 && (
              <ul className="mt-4 list-disc pl-5 text-neutral-600">
                {content.aboutBullets.map((item, idx) => (
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
