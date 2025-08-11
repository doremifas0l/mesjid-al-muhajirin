// app/api/finance/route.ts  (or pages/api/finance.ts depending on your app structure)
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const ITEMS_PER_PAGE = 10

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const timeRange = searchParams.get("range") || "monthly"
  const category = searchParams.get("category") || "Semua"
  const type = searchParams.get("type") || "all"
  const page = parseInt(searchParams.get("page") || "1", 10)

  const admin = getSupabaseAdmin()

  try {
    const { data: categoriesData, error: categoriesError } = await admin
      .from("finance_categories")
      .select("name")
    if (categoriesError) throw categoriesError
    const categories = ["Semua", ...(categoriesData?.map((c) => c.name) || [])]

    let query = admin.from("finance_transactions").select("*", { count: "exact" })

    if (timeRange === "monthly" || timeRange === "yearly") {
      const now = new Date()
      const year = now.getFullYear()
      const startDate = timeRange === "monthly" ? new Date(year, now.getMonth(), 1) : new Date(year, 0, 1)
      query = query.gte("occured_at", startDate.toISOString())
    }

    if (category !== "Semua") {
      query = query.eq("category", category)
    }

    if (type === "income" || type === "expense") {
      query = query.eq("type", type)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to).order("occured_at", { ascending: false })

    const { data: transactions, error: transactionsError, count } = await query
    if (transactionsError) throw transactionsError

    // normalize response to expected shapes:
    const safeTransactions = Array.isArray(transactions) ? transactions : []
    const safeCount = typeof count === "number" ? count : (safeTransactions.length || 0)

    // compute totals defensively
    const income = safeTransactions
      .filter((i) => i?.type === "income")
      .reduce((s, i) => s + (Number(i?.amount) || 0), 0)
    const expense = safeTransactions
      .filter((i) => i?.type === "expense")
      .reduce((s, i) => s + (Number(i?.amount) || 0), 0)
    const balance = income - expense
    const totals = { income, expense, balance }

    return NextResponse.json({
      data: {
        totals,
        transactions: safeTransactions,
        categories,
        count: safeCount,
      },
    })
  } catch (error: any) {
    console.error("API Finance Error:", error)
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 })
  }
}
