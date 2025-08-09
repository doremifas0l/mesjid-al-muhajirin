// File: lib/supabase/client.ts

import { createClient } from '@supabase/supabase-js'

// These are the environment variables that this client file will attempt to read.
// They MUST be available to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This error is the reason your page gets stuck. On Vercel, one of these is 'undefined'.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("CRITICAL ERROR: Your app is missing the public Supabase URL or anonymous key. The client cannot be created. Check your Vercel Environment Variables.")
}

// Create and export the client directly.
// This is the standard, recommended pattern.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
