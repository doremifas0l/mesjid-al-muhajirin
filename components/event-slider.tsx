"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import EventCard, { type EventItem } from "@/components/event-card"
import { Button } from "@/components/ui/button"

export default function EventSlider({ events }: { events: EventItem[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  )

  const viewportRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  function scrollToIdx(next: number) {
    const container = viewportRef.current
    if (!container) return
    const clamped = Math.max(0, Math.min(next, sorted.length - 1))
    setIndex(clamped)
    const card = container.querySelectorAll<HTMLElement>("[data-slide]")[clamped]
    if (card) {
      card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
    }
  }

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
        aria-roledescription="carousel"
        aria-label="Kegiatan Mendatang"
      >
        {sorted.map((ev, i) => (
          <div
            key={ev.id}
            data-slide
            className="snap-start shrink-0 basis-[85%] sm:basis-[60%] md:basis-[45%] lg:basis-[32%]"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} dari ${sorted.length}`}
          >
            <EventCard event={ev} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
        <Button
          type="button"
          className="pointer-events-auto bg-transparent"
          variant="outline"
          size="icon"
          aria-label="Sebelumnya"
          onClick={() => scrollToIdx(index - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
        <Button
          type="button"
          className="pointer-events-auto bg-transparent"
          variant="outline"
          size="icon"
          aria-label="Berikutnya"
          onClick={() => scrollToIdx(index + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
