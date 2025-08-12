// components/article-card.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
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

export default function ArticleCard({ article }: { article: ArticleCardInput }) {
  const formattedDate = new Date(article.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const imgSrc = article.image_url || "/mosque-event-banner.png" // Fallback image

  return (
    <Link href={`/artikel/${article.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="relative h-48 w-full">
          <Image
            src={imgSrc}
            alt={`Gambar untuk artikel ${article.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
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
      </Card>
    </Link>
  )
}