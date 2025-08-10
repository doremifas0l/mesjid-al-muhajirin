// File: lib/supabase/admin.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (adminClient) return adminClient
  
  // --- MODIFIED: Use the correct, existing environment variable ---
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false },
  })

  return adminClient
}
