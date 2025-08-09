"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Props = {
  images?: string[]
  intervalMs?: number
  ariaLabel?: string
}

export default function HeroSlideshow({ images = [], intervalMs = 5000, ariaLabel = "Slideshow gambar hero" }: Props) {
  const slides = useMemo(() => images.filter(Boolean).slice(0, 5), [images])
  const [index, setIndex] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (slides.length <= 1) return
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, intervalMs)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [slides.length, intervalMs])

  if (slides.length === 0) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200/80">
        <img src="/hero-slideshow-placeholder.png" alt="Placeholder slideshow" className="h-full w-full object-cover" />
      </div>
    )
  }

  function prev() {
    setIndex((i) => (i - 1 + slides.length) % slides.length)
  }

  function next() {
    setIndex((i) => (i + 1) % slides.length)
  }

  return (
    <div className="relative" role="region" aria-label={ariaLabel}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200/80">
        {slides.map((src, i) => (
          <img
            key={i}
            src={src || "/placeholder.svg"}
            alt={`Slide ${i + 1}`}
            className={
              "absolute left-0 top-0 h-full w-full object-cover transition-opacity duration-500 " +
              (i === index ? "opacity-100" : "opacity-0")
            }
          />
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="pointer-events-auto bg-white/70 backdrop-blur"
              aria-label="Sebelumnya"
              onClick={prev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="pointer-events-auto bg-white/70 backdrop-blur"
              aria-label="Berikutnya"
              onClick={next}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Ke slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={"h-2 w-2 rounded-full border border-white/70 " + (i === index ? "bg-white" : "bg-white/40")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
