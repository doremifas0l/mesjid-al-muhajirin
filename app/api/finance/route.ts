import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const timeRange = searchParams.get("range") || "monthly"
  const category = searchParams.get("category") || "Semua"

  const admin = getSupabaseAdmin()

  try {
    const { data: categoriesData, error: categoriesError } = await admin
      .from("finance_categories")
      .select("name")

    if (categoriesError) throw categoriesError
    const categories = ["Semua", ...(categoriesData?.map((c) => c.name) || [])]

    let query = admin.from("finance_transactions").select("*")

    if (timeRange === "monthly" || timeRange === "yearly") {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const startDate = timeRange === "monthly" ? new Date(year, month, 1) : new Date(year, 0, 1)
      query = query.gte("occured_at", startDate.toISOString())
    }

    if (category !== "Semua") {
      query = query.eq("category", category)
    }

    const { data: transactions, error: transactionsError } = await query
    if (transactionsError) throw transactionsError

    // --- THE CRITICAL FIX IS HERE ---
    // If the database returns `null` (no rows found), we default to an empty array.
    // This prevents any crashes on the lines below.
    const safeTransactions = transactions || []
    // --- END OF FIX ---

    // Now, we use the "safe" version of the array for all calculations.
    const income = safeTransactions.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0)
    const expense = safeTransactions.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    const balance = income - expense
    const totals = { income, expense, balance }

    const recent = [...safeTransactions]
      .sort((a, b) => new Date(b.occured_at).getTime() - new Date(a.occured_at).getTime())
      .slice(0, 5)

    return NextResponse.json({
      data: {
        totals,
        recent, // This is now safe
        categories,
      },
    })
  } catch (error: any) {
    console.error("API Finance Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
