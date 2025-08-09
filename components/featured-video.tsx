"use client"

import { useEffect, useState } from "react"

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null
    if (u.searchParams.get("v")) return u.searchParams.get("v")
    // embed form
    const parts = u.pathname.split("/")
    const idx = parts.findIndex((p) => p === "embed")
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    return null
  } catch {
    return null
  }
}

export default function FeaturedVideo({
  fallback = "https://www.youtube.com/watch?v=oJyWJ8d4TUs",
  title = "MUHAJIRIN CHANNEL",
}: {
  fallback?: string
  title?: string
}) {
  const [videoUrl, setVideoUrl] = useState<string>(fallback)

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/homepage/content")
      if (res.ok) {
        const j = await res.json()
        const url = j?.data?.featured_video_url
        if (typeof url === "string" && url.length > 0) setVideoUrl(url)
      }
    })()
  }, [])

  const id = extractYouTubeId(videoUrl) || extractYouTubeId(fallback)
  const embed = id ? `https://www.youtube.com/embed/${id}` : undefined

  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-black">
      {embed ? (
        <iframe
          className="aspect-video w-full"
          src={`${embed}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="aspect-video w-full bg-neutral-200" />
      )}
    </div>
  )
}
