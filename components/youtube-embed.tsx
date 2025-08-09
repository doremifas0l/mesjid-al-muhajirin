"use client"

type Props = {
  // Optional: YouTube uploads playlist ID (e.g. "UUxxxxxxxxxxxxxxx").
  playlistId?: string
  // Fallback search query if playlistId is not provided.
  query?: string
  // Section title for accessibility.
  title?: string
}

export default function YouTubeEmbed({ playlistId, query = "almuhajirinsarimas", title = "MUHAJIRIN CHANNEL" }: Props) {
  // Prefer a playlist when available; otherwise use a search-based playlist.
  const src = playlistId
    ? `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(
        playlistId,
      )}&rel=0&modestbranding=1&color=white`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
        query,
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
    </div>
  )
}
