// lib/supabase-client.ts

import { createClient } from '@supabase/supabase-js'

// These variables MUST be prefixed with NEXT_PUBLIC_
// to be available in the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// This is the public client, safe for the browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
