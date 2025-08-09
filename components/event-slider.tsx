"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import EventCard, { type EventItem } from "@/components/event-card"

export default function EventSlider({ events }: { events: EventItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  function scrollBy(delta: number) {
    const el = containerRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: "smooth" })
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {events.map((event) => (
          <div key={event.id} className="min-w-[280px] max-w-[360px] snap-start">
            <EventCard event={event} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
        <Button
          size="icon"
          variant="outline"
          className="pointer-events-auto rounded-full bg-white/80"
          onClick={() => scrollBy(-320)}
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
        <Button
          size="icon"
          variant="outline"
          className="pointer-events-auto rounded-full bg-white/80"
          onClick={() => scrollBy(320)}
          aria-label="Berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
