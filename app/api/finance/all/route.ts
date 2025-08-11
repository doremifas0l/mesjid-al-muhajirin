import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const ITEMS_PER_PAGE = 15 // You can adjust how many items to show per page

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const timeRange = searchParams.get("range") || "monthly"
  const category = searchParams.get("category") || "Semua"
  const type = searchParams.get("type") || "all"
  const page = parseInt(searchParams.get("page") || "1", 10)

  const admin = getSupabaseAdmin()

  try {
    // 1. Fetch all available categories for the dropdown filter
    const { data: categoriesData, error: categoriesError } = await admin
      .from("finance_categories")
      .select("name")
    if (categoriesError) throw categoriesError
    const categories = ["Semua", ...(categoriesData?.map((c) => c.name) || [])]

    // 2. Build the main query, getting a total count for pagination
    let query = admin.from("finance_transactions").select("*", { count: "exact" })

    // Apply Time Range Filter
    if (timeRange === "monthly" || timeRange === "yearly") {
      const now = new Date()
      const year = now.getFullYear()
      const startDate = timeRange === "monthly" ? new Date(year, now.getMonth(), 1) : new Date(year, 0, 1)
      query = query.gte("occured_at", startDate.toISOString())
    }

    // Apply Category Filter
    if (category !== "Semua") {
      query = query.eq("category", category)
    }

    // Apply Transaction Type Filter (Income/Expense)
    if (type === "income" || type === "expense") {
      query = query.eq("type", type)
    }

    // 3. Apply Pagination
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to).order("occured_at", { ascending: false }) // Order by newest first

    // Execute the final query
    const { data: transactions, error: transactionsError, count } = await query
    if (transactionsError) throw transactionsError

    // 4. Send the complete data payload to the frontend
    return NextResponse.json({
      data: {
        transactions: transactions || [], // Ensure it's always an array
        categories,
        totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
      },
    })
  } catch (error: any) {
    console.error("API /finance/all Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
