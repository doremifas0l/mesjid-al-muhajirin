"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { CalendarDays, MapPin, Clock } from "lucide-react"

// Accept either legacy {date,time,imageUrl} or new {starts_at,image_url}
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

function normalizeDate(input?: string) {
  if (!input) return null
  const c = input.includes(" ") ? input.replace(" ", "T") : input
  const d = new Date(c)
  return Number.isFinite(d.getTime()) ? d : null
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

  const iso = "starts_at" in fallback ? fallback.starts_at : fallback.date
  const d = normalizeDate(iso)

  const dateText = d
    ? d.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Tanggal tidak valid"
  const timeFromEvent = "time" in fallback ? fallback.time : undefined
  const timeText = timeFromEvent || (d ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "-")

  const rawUrl = ("image_url" in fallback && fallback.image_url) || ("imageUrl" in fallback && fallback.imageUrl) || ""
  const imgSrc = rawUrl || "/mosque-event-banner.png"
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
          <span>{dateText}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-700" />
          <span>{timeText}</span>
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
