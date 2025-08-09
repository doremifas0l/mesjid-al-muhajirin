// Server-side Supabase admin client (service role)
import { createClient } from "@supabase/supabase-js"

let adminSingleton: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (adminSingleton) return adminSingleton
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  }
  adminSingleton = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminSingleton
}
