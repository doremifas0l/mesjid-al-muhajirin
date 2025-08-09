"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { CalendarDays, MapPin, Clock } from "lucide-react"

export type EventCardInput =
  | {
      id: string
      title: string
      date: string // ISO
      time?: string
      location?: string
      description?: string
      imageUrl?: string
      image_url?: never
      starts_at?: never
    }
  | {
      id: string
      title: string
      starts_at: string // ISO
      location?: string
      description?: string
      image_url?: string
      imageUrl?: never
      date?: never
      time?: never
    }

function formatDateTime(iso?: string) {
  if (!iso) return { date: "Tanggal tidak diketahui", time: "" }
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return { date: "Tanggal tidak valid", time: "" }
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  return { date: dateStr, time: timeStr }
}

export default function EventCard({ event }: { event?: EventCardInput }) {
  const fallback: EventCardInput =
    event ??
    ({
      id: "default",
      title: "Kegiatan Masjid",
      date: new Date().toISOString(),
      time: "00:00",
      location: "Mesjid Al Muhajirin",
      description: "Deskripsi kegiatan.",
      imageUrl: "/mosque-event-banner.png",
    } as const)

  // Normalize fields
  const iso = "starts_at" in fallback ? fallback.starts_at : fallback.date
  const timeFromEvent = "time" in fallback ? fallback.time : undefined
  const { date, time } = formatDateTime(iso)
  const timeText = timeFromEvent || time

  // Pick image URL (support both keys)
  const rawUrl = ("image_url" in fallback && fallback.image_url) || ("imageUrl" in fallback && fallback.imageUrl) || ""
  const imgSrc = rawUrl || "/mosque-community-gathering.png"

  // Use next/image for local assets; <img> for remote/data URLs to avoid remotePatterns requirement [^2][^4]
  const isLocal = imgSrc.startsWith("/")

  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 w-full">
        {isLocal ? (
          <Image
            src={imgSrc || "/placeholder.svg"}
            alt={`Gambar kegiatan ${fallback.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <img
            src={imgSrc || "/placeholder.svg"}
            alt={`Gambar kegiatan ${fallback.title}`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-emerald-900">{fallback.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-emerald-800/80">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-700" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-700" />
          <span>{timeText || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <span>{("location" in fallback && fallback.location) || "Mesjid Al Muhajirin"}</span>
        </div>
        {"description" in fallback && fallback.description && <p className="pt-2">{fallback.description}</p>}
      </CardContent>
    </Card>
  )
}

// Note: next/image requires remotePatterns for external domains if used; fallback to <img> ensures images render without extra config [^2][^4]
