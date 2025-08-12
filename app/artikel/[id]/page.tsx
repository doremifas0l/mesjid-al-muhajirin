// app/artikel/[id]/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'

// Define the shape of the full article object
type Article = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    image_url: string | null;
    category_name: string | null;
}

export default function ArticlePage() {
    const params = useParams();
    const { id } = params;

    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchArticle = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/articles/${id}`);
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || `Error: ${res.status}`);
                }
                const { data } = await res.json();
                setArticle(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p>Loading article...</p>
            </div>
        )
    }

    if (error) {
        return (
             <div className="flex h-screen flex-col items-center justify-center">
                <p className="text-red-500">{error}</p>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">
                    Back to Home
                </Link>
            </div>
        )
    }

    if (!article) {
        return null;
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            <Header />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
                <div className="mb-8">
                     <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Halaman Utama
                    </Link>
                </div>

                <article>
                    {article.image_url && (
                        <img
                            src={article.image_url}
                            alt={article.title}
                            className="aspect-video w-full rounded-xl object-cover shadow-lg"
                        />
                    )}

                    <div className="mt-8">
                        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                            {article.title}
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600">
                            <div className="flex items-center">
                                <Calendar className="mr-1.5 h-4 w-4" />
                                <span>{new Date(article.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            {article.category_name && (
                                <div className="flex items-center">
                                    <Tag className="mr-1.5 h-4 w-4" />
                                    <Badge variant="secondary">{article.category_name}</Badge>
                                </div>
                            )}
                        </div>
                        
                        <div className="prose prose-lg mt-6 max-w-none text-neutral-800">
                            <p className="whitespace-pre-wrap">{article.content}</p>
                        </div>
                    </div>
                </article>
            </main>
        </div>
    )
}