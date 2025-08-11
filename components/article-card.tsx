// components/article-card.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image" // We still use this for local images
import Link from "next/link"
import { CalendarDays, Tag } from "lucide-react"

// Define the shape of the article prop this card expects
export type ArticleCardInput = {
  id: string
  title: string
  created_at: string // ISO string
  image_url: string | null
  category_name: string | null
}

export default function ArticleCard({ article }: { article?: ArticleCardInput }) {
  // Add a fallback to prevent errors if the article prop is ever missing
  if (!article) {
    return null
  }

  const formattedDate = new Date(article.created_at).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const imgSrc = article.image_url || "/mosque-event-banner.png"
  
  // --- THIS IS THE KEY CHANGE ---
  // Check if the image source is a local file or a remote URL
  const isLocalImage = imgSrc.startsWith("/")

  return (
    <Link href={`/artikel/${article.id}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="relative h-48 w-full">
          {isLocalImage ? (
            // Use Next.js Image for local files for optimization
            <Image
              src={imgSrc}
              alt={`Gambar untuk artikel ${article.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            // Use a standard <img> tag for external URLs to avoid build errors
            <img
              src={imgSrc}
              alt={`Gambar untuk artikel ${article.title}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between">
            <CardHeader>
              <CardTitle className="line-clamp-2 text-lg font-bold text-neutral-900 group-hover:text-blue-700">
                {article.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-500" />
                <span>{formattedDate}</span>
              </div>
              {article.category_name && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-neutral-500" />
                  <Badge variant="secondary">{article.category_name}</Badge>
                </div>
              )}
            </CardContent>
        </div>
      </Card>
    </Link>
  )
}
