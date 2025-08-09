"use server"

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

type State = {
  success: boolean
  message?: string
}

function createServiceSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// Server Action: verify admin password against hashed value in Supabase.
export async function verifyAdminPassword(_prevState: State | undefined, formData: FormData): Promise<State> {
  try {
    const password = formData.get("password")
    if (typeof password !== "string" || password.length === 0) {
      return { success: false, message: "Password wajib diisi." }
    }

    const supabase = createServiceSupabase()
    const { data, error } = await supabase.from("admin_auth").select("password_hash").eq("id", 1).single()

    if (error || !data?.password_hash) {
      return { success: false, message: "Konfigurasi admin belum tersedia. Jalankan seed terlebih dahulu." }
    }

    const ok = await bcrypt.compare(password, data.password_hash)
    if (!ok) {
      return { success: false, message: "Password salah." }
    }

    // Optionally set a cookie for server-side checks later (not required for current UI).
    cookies().set("masjid_admin_authed", "true", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // short-lived demo cookie
      maxAge: 60 * 60,
    })

    return { success: true, message: "Berhasil masuk." }
  } catch (e) {
    return { success: false, message: "Terjadi kesalahan saat verifikasi." }
  }
}
