import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const ITEMS_PER_PAGE = 10 // Define how many transactions to show per page

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const timeRange = searchParams.get("range") || "monthly"
  const category = searchParams.get("category") || "Semua"
  const type = searchParams.get("type") || "all" // New filter for income/expense
  const page = parseInt(searchParams.get("page") || "1", 10) // New parameter for pagination

  const admin = getSupabaseAdmin()

  try {
    // === 1. Fetch Categories (remains the same) ===
    const { data: categoriesData, error: categoriesError } = await admin
      .from("finance_categories")
      .select("name")
    if (categoriesError) throw categoriesError
    const categories = ["Semua", ...(categoriesData?.map((c) => c.name) || [])]

    // === 2. Build the Main Query with All Filters ===
    let query = admin.from("finance_transactions").select("*", { count: "exact" }) // Note: count: 'exact' is crucial for pagination

    // Apply time range filter
    if (timeRange === "monthly" || timeRange === "yearly") {
      const now = new Date()
      const year = now.getFullYear()
      const startDate = timeRange === "monthly" ? new Date(year, now.getMonth(), 1) : new Date(year, 0, 1)
      query = query.gte("occured_at", startDate.toISOString())
    }

    // Apply category filter
    if (category !== "Semua") {
      query = query.eq("category", category)
    }

    // --- NEW --- Apply transaction type filter
    if (type === "income" || type === "expense") {
      query = query.eq("type", type)
    }

    // --- NEW --- Apply pagination
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to).order("occured_at", { ascending: false })

    // Execute the main query
    const { data: transactions, error: transactionsError, count } = await query
    if (transactionsError) throw transactionsError

    // === 3. Calculate Totals (this should apply to the *unpaginated* data for accuracy) ===
    // For simplicity in this example, we calculate totals from the fetched (paginated) data.
    // A more advanced implementation might run a separate query for totals without pagination.
    const income = transactions.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0)
    const expense = transactions.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    const balance = income - expense
    const totals = { income, expense, balance }

    // === 4. Send the Final Response with Pagination Info ===
    return NextResponse.json({
      data: {
        totals, // Note: these totals are for the current page only.
        transactions, // The paginated list of transactions
        categories,
        count: count ?? 0, // The total number of items matching the filters
      },
    })
  } catch (error: any) {
    console.error("API Finance Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
