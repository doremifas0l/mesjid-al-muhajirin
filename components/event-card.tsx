"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { CalendarDays, MapPin, Clock } from "lucide-react"

export type EventItem = {
  id: string
  title: string
  date: string // ISO
  time: string
  location: string
  description: string
  imageUrl?: string
}

export default function EventCard({ event }: { event?: EventItem }) {
  const fallback: EventItem = event ?? {
    id: "default",
    title: "Kegiatan Masjid",
    date: new Date().toISOString(),
    time: "00:00",
    location: "Masjid",
    description: "Deskripsi kegiatan.",
    imageUrl: "/mosque-event-banner.png",
  }

  const d = new Date(fallback.date)
  const dateStr = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 w-full">
        <Image
          src={fallback.imageUrl || "/placeholder.svg?height=400&width=640&query=mosque%20community%20gathering"}
          alt={`Gambar kegiatan ${fallback.title}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle className="text-emerald-900">{fallback.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-emerald-800/80">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-700" />
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-700" />
          <span>{fallback.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <span>{fallback.location}</span>
        </div>
        <p className="pt-2">{fallback.description}</p>
      </CardContent>
    </Card>
  )
}
