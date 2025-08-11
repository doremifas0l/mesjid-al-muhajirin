import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

type LinkItem = {
  url: string;
  label: string;
  type: 'link' | 'file';
}

type RequestPayload = {
  title: string;
  content: string;
  links: LinkItem[];
};

export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  const body = (await req.json()) as RequestPayload;

  try {
    const { data: categories, error: categoriesError } = await admin.from("note_categories").select("id, name");
    if (categoriesError) throw new Error(`Could not fetch categories: ${categoriesError.message}`);
    const categoryNames = categories?.map(c => c.name) || [];

    let externalContent = "";
    if (body.links && body.links.length > 0) {
      for (const link of body.links) {
        try {
          let extractedText = "";
          console.log(`Processing link (${link.type}): ${link.url}`);

          if (link.type === 'link') {
            if (link.url.includes("youtube.com") || link.url.includes("youtu.be")) {
              const { YoutubeTranscript } = await import('youtube-transcript');
              const transcript = await YoutubeTranscript.fetchTranscript(link.url);
              extractedText = transcript.map(item => item.text).join(' ');
            } else {
              const cheerio = await import('cheerio');
              const response = await fetch(link.url);
              const html = await response.text();
              const $ = cheerio.load(html);
              $('script, style, nav, footer, header').remove();
              extractedText = $('body').text().replace(/\s\s+/g, ' ').trim();
            }
          } else if (link.type === 'file') {
            const fileResponse = await fetch(link.url);
            if (!fileResponse.ok) throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
            const fileBuffer = await fileResponse.arrayBuffer();

            if (link.label.endsWith('.pdf')) {
              const pdf = (await import('pdf-parse')).default;
              const data = await pdf(Buffer.from(fileBuffer));
              extractedText = data.text;
            } else if (link.label.endsWith('.docx')) {
              const mammoth = (await import('mammoth')).default;
              const { value } = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
              extractedText = value;
            } else if (link.label.endsWith('.txt') || link.label.endsWith('.md')) {
              extractedText = Buffer.from(fileBuffer).toString('utf-8');
            }
          }
          
          if (extractedText) {
             externalContent += `\n\n--- MULAI KONTEN DARI: ${link.label} ---\n${extractedText}\n--- SELESAI KONTEN DARI: ${link.label} ---\n`;
          }
        } catch (e: any) {
          console.warn(`Could not process content for ${link.label} (${link.url}):`, e.message);
          
          // --- IMPROVED ERROR HANDLING ---
          let failureReason = "terjadi kesalahan umum saat memproses";
          if (e.message.toLowerCase().includes("transcript is disabled") || e.message.toLowerCase().includes("no transcripts found")) {
              failureReason = "tidak ditemukan transkrip (subtitle/caption) untuk video ini";
          } else if (e.message.toLowerCase().includes("private")) {
              failureReason = "video ini bersifat pribadi (private) atau tidak tersedia";
          }
          externalContent += `\n\n[PERINGATAN: Gagal memproses tautan "${link.label}". Penyebab: ${failureReason}.]`;
        }
      }
    }

    const aiResponseSchema = z.object({
        enhanced_content: z.string().describe("Tingkatkan dan perbaiki konten. Buat agar jelas, terstruktur, dan informatif. Gunakan Bahasa Indonesia yang baik dan benar."),
        suggested_category_name: z.string().describe(`Kategori yang paling cocok dari daftar ini: [${categoryNames.join(", ")}]. Jika tidak ada, buat kategori baru yang relevan dalam Bahasa Indonesia (maksimal 3 kata).`),
    });

    // --- IMPROVED AI PROMPT ---
    const { object: aiResponse } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: aiResponseSchema,
      prompt: `Anda adalah asisten cerdas yang bertugas merangkum informasi untuk website masjid.
      Proses dan gabungkan semua informasi berikut menjadi satu catatan yang utuh dan informatif.
      
      Informasi utama dari admin:
      Judul: "${body.title}"
      Catatan Tambahan: "${body.content}"
      
      ${externalContent ? `Konten yang diekstrak dari tautan dan file terlampir:\n${externalContent}` : ""}

      Lakukan tugas-tugas berikut, pastikan SEMUA output dalam Bahasa Indonesia:
      1. BUAT SEBUAH RINGKASAN UTUH: Gabungkan catatan tambahan dari admin dengan konten yang diekstrak. Hasilkan satu konten baru yang terstruktur, jelas, dan mudah dibaca.
      2. TANGANI PERINGATAN: Jika Anda melihat teks "[PERINGATAN: ...]", sebutkan secara jelas di dalam ringkasan Anda bahwa sebuah tautan tidak dapat diproses dan jelaskan alasannya sesuai dengan isi peringatan tersebut.
      3. SARANKAN KATEGORI: Tentukan kategori yang paling cocok untuk ringkasan akhir dari daftar ini: [${categoryNames.join(", ")}]. Jika tidak ada yang pas, buat kategori baru yang singkat dan relevan.`,
    });
    
    const { enhanced_content, suggested_category_name } = aiResponse;

    let category_id = null;
    const existingCategory = categories?.find(c => c.name.toLowerCase() === suggested_category_name.toLowerCase());

    if (existingCategory) {
      category_id = existingCategory.id;
    } else {
      const { data: newCategory, error: newCategoryError } = await admin.from("note_categories").insert({ name: suggested_category_name }).select("id").single();
      if (newCategoryError) throw new Error(`Could not create new category: ${newCategoryError.message}`);
      category_id = newCategory.id;
    }

    const payloadToInsert = {
      title: body.title,
      content: enhanced_content,
      category_id: category_id,
      links: body.links.length > 0 ? body.links : null,
    };

    const { data: finalNote, error: insertError } = await admin.from("notes").insert(payloadToInsert).select(`id, title, content, created_at, links, category_id, note_categories ( name )`).single();
    if (insertError) throw new Error(`Could not save final note: ${insertError.message}`);
    
    const reshapedData = {
      id: finalNote.id,
      title: finalNote.title,
      content: finalNote.content,
      created_at: finalNote.created_at,
      links: finalNote.links,
      category_id: finalNote.category_id,
      category_name: (finalNote.note_categories as any)?.name || suggested_category_name
    };
    return NextResponse.json({ data: reshapedData });

  } catch (error: any) {
    console.error("AI Processing Error:", error);
    return NextResponse.json({ error: "Gagal memproses dengan AI: " + error.message }, { status: 500 });
  }
}
