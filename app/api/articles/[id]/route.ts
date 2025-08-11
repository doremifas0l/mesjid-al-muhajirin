// app/api/articles/[id]/route.ts

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const admin = getSupabaseAdmin();
    const { id } = params;

    if (!id) {
        return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    try {
        const { data: article, error } = await admin
            .from("notes")
            .select("id, title, content, created_at, image_url, public, note_categories ( name )")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Fetch Single Article DB Error:", error.message);
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        // Security Check: Even if found, only show it if it's marked as public.
        if (!article.public) {
            return NextResponse.json({ error: "This article is not public" }, { status: 403 });
        }

        // Reshape data
        const responseData = {
            id: article.id,
            title: article.title,
            content: article.content,
            created_at: article.created_at,
            image_url: article.image_url,
            category_name: (article.note_categories as any)?.name || null
        }

        return NextResponse.json({ data: responseData });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
