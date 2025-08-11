// app/api/articles/route.ts

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const admin = getSupabaseAdmin();
    // Allow the frontend to request a certain number of articles, e.g., for the homepage
    const limit = req.nextUrl.searchParams.get('limit');

    try {
        let query = admin
            .from("notes")
            .select("id, title, created_at, image_url, note_categories ( name )")
            .eq("public", true) // IMPORTANT: Only fetch public notes
            .order("created_at", { ascending: false });

        if (limit) {
            query = query.limit(Number(limit));
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch articles: ${error.message}`);
        }

        // Reshape data to be more friendly for the frontend
        const articles = data.map(item => ({
            id: item.id,
            title: item.title,
            created_at: item.created_at,
            image_url: item.image_url,
            category_name: (item.note_categories as any)?.name || null
        }));

        return NextResponse.json({ data: articles });

    } catch (error: any) {
        console.error("Get Articles Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
