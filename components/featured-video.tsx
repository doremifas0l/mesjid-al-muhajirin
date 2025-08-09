"use client"

import { useEffect, useMemo, useState } from "react"

/**
 * FeaturedVideo displays a specific YouTube video if present in localStorage (key: masjid_featured_video),
 * otherwise uses the provided defaultVideoUrl. If neither is present, it falls back to a channel search playlist.
 */
export default function FeaturedVideo({
  channelHandle = "@almuhajirinsarimas",
  title = "MUHAJIRIN CHANNEL",
  defaultVideoUrl,
}: {
  channelHandle?: string
  title?: string
  defaultVideoUrl?: string
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("masjid_featured_video")
    if (stored && stored.trim().length > 0) {
      setVideoUrl(stored.trim())
    } else if (defaultVideoUrl && defaultVideoUrl.trim().length > 0) {
      setVideoUrl(defaultVideoUrl.trim())
    } else {
      setVideoUrl(null)
    }
  }, [defaultVideoUrl])

  const videoId = useMemo(() => {
    if (!videoUrl) return null
    try {
      const u = new URL(videoUrl)
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.slice(1)
      }
      if (u.searchParams.get("v")) {
        return u.searchParams.get("v")
      }
      const parts = u.pathname.split("/")
      const idx = parts.findIndex((p) => p === "embed")
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
      return null
    } catch {
      return null
    }
  }, [videoUrl])

  const src = videoId
    ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&color=white`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
        channelHandle.replace(/^@/, ""),
      )}&rel=0&modestbranding=1&color=white`

  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border">
        <iframe
          title={title}
          src={src}
          className="absolute left-0 top-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {!videoId && (
        <p className="mt-2 text-xs text-neutral-500">
          Menampilkan playlist pencarian untuk {channelHandle}. Atur URL video di Dashboard &gt; Homepage.
        </p>
      )}
    </div>
  )
}
