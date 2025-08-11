import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin" // Assuming you have a helper for the admin client

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const timeRange = searchParams.get("range") || "monthly"
  const category = searchParams.get("category") || "Semua"

  const admin = getSupabaseAdmin()

  try {
    // === 1. Fetch Categories ===
    // We'll get all available categories to populate the dropdown.
    const { data: categoriesData, error: categoriesError } = await admin
      .from("finance_categories")
      .select("name")

    if (categoriesError) throw categoriesError

    const categories = ["Semua", ...(categoriesData?.map((c) => c.name) || [])]

    // === 2. Build the Main Query Based on Filters ===
    let query = admin.from("finance_transactions").select("*")

    // Apply time range filter
    if (timeRange === "monthly" || timeRange === "yearly") {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      
      let startDate: Date;
      if (timeRange === 'monthly') {
        startDate = new Date(year, month, 1) // Start of the current month
      } else { // yearly
        startDate = new Date(year, 0, 1) // Start of the current year
      }
      
      query = query.gte("occured_at", startDate.toISOString())
    }

    // Apply category filter
    if (category !== "Semua") {
      // Your schema uses 'category' text field, so we filter by that.
      query = query.eq("category", category)
    }

    // Execute the main query
    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) throw transactionsError

    // === 3. Calculate Totals and Get Recent Transactions ===
    const income = transactions.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0)
    const expense = transactions.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    const balance = income - expense
    const totals = { income, expense, balance }

    const recent = [...transactions]
      .sort((a, b) => new Date(b.occured_at).getTime() - new Date(a.occured_at).getTime())
      .slice(0, 5)

    // === 4. Send the Final Response ===
    return NextResponse.json({
      data: {
        totals,
        recent,
        categories,
      },
    })
  } catch (error: any) {
    console.error("API Finance Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
