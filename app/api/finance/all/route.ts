import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// This API is dedicated to fetching a list of all transactions for the new page.
export async function GET() {
  const admin = getSupabaseAdmin()
  try {
    const { data: transactions, error } = await admin
      .from("finance_transactions")
      .select("*")
      .order("occured_at", { ascending: false }) // Get newest first

    if (error) throw error

    return NextResponse.json({
      data: transactions || [], // Always return an array
    })
  } catch (error: any) {
    console.error("API /all-transactions Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
