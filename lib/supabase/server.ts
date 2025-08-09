import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let serverClient: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (serverClient) return serverClient
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY")
  }
  serverClient = createClient(url, anon, {
    auth: { persistSession: false },
  })
  return serverClient
}
