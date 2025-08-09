"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"

type Props = {
  images: string[]
  intervalMs?: number
  className?: string
}

export default function HeroSlideshow({ images, intervalMs = 4000, className }: Props) {
  const [index, setIndex] = useState(0)
  const timer = useRef<NodeJS.Timeout | null>(null)
  const count = Math.min(5, images.length)

  useEffect(() => {
    if (count <= 1) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, intervalMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [count, intervalMs])

  // Fallback placeholder
  if (!images || images.length === 0) {
    return (
      <div
        className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200/80", className)}
      >
        <Image
          src="/mosque-hero-placeholder.png"
          alt="Placeholder gambar hero"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
    )
  }

  return (
    <div
      className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200/80", className)}
    >
      {images.slice(0, 5).map((src, i) => (
        <Image
          key={`${src}-${i}`}
          src={src || "/placeholder.svg"}
          alt={`Slide ${i + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={cn(
            "absolute inset-0 object-cover transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0",
          )}
          priority={i === 0}
        />
      ))}
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.slice(0, 5).map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-4 rounded-full bg-black/20", i === index ? "bg-black/60" : "bg-black/20")}
            />
          ))}
        </div>
      )}
    </div>
  )
}
