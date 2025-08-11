"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label" // --- NEW --- Import the Label component

type FinanceType = "income" | "expense"

type FinanceItem = {
  id: string
  type: FinanceType
  amount: number
  category: string
  note?: string
  date: string // ISO
}

type TimeRange = "monthly" | "yearly" | "all"

const CATEGORIES_KEY = "masjid_finance_categories"

export default function FinancePreview() {
  const [items, setItems] = useState<FinanceItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<string>("Semua")

  // --- MODIFIED ---
  // The default time range is now "monthly"
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("masjid_finance")
    if (raw) {
      try {
        setItems(JSON.parse(raw) as FinanceItem[])
      } catch {
        setItems([])
      }
    }
    const cats = localStorage.getItem(CATEGORIES_KEY)
    if (cats) {
      try {
        const parsed = JSON.parse(cats) as string[]
        const allCats = new Set(parsed)
        ;(JSON.parse(raw || "[]") as FinanceItem[]).forEach((i) => allCats.add(i.category))
        setCategories(["Semua", ...Array.from(allCats)])
      } catch {
        setCategories(["Semua"])
      }
    } else {
      const setCats = new Set<string>()
      ;(JSON.parse(raw || "[]") as FinanceItem[]).forEach((i) => setCats.add(i.category))
      setCategories(["Semua", ...Array.from(setCats)])
    }
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    const timeFilteredItems = items.filter((item) => {
      if (timeRange === "all") return true
      const itemDate = new Date(item.date)
      if (timeRange === "monthly") {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
      }
      if (timeRange === "yearly") {
        return itemDate.getFullYear() === now.getFullYear()
      }
      return true
    })

    if (selected === "Semua") return timeFilteredItems
    return timeFilteredItems.filter((i) => i.category === selected)
  }, [items, selected, timeRange])

  const totals = useMemo(() => {
    const income = filtered.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0)
    const expense = filtered.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    const balance = income - expense
    return { income, expense, balance }
  }, [filtered])

  const recent = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  }, [filtered])

  return (
    <section id="finance" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      {/* --- AESTHETIC CHANGE --- */}
      {/* Changed sm:items-end to sm:items-center for better vertical alignment */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Keuangan</h2>
          <p className="mt-1 text-sm text-neutral-600">Ringkasan pemasukan, pengeluaran, dan saldo.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {/* Time Filter with Label */}
          <div className="grid w-full sm:w-40 gap-1.5">
            <Label>Filter Waktu</Label>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Category Filter with Label */}
          <div className="grid w-full sm:w-56 gap-1.5">
            <Label>Filter Kategori</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Filter kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* The rest of your component remains the same */}
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-900">Total Pemasukan</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-700">
            {totals.income.toLocaleString(undefined, { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-900">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-700">
            {totals.expense.toLocaleString(undefined, { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-900">Saldo</CardTitle>
          </CardHeader>
          <CardContent
            className={"text-2xl font-semibold " + (totals.balance >= 0 ? "text-neutral-900" : "text-rose-700")}
          >
            {totals.balance.toLocaleString(undefined, { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-neutral-900">
            {selected === "Semua" ? "Transaksi Terbaru" : "Transaksi Terbaru • " + selected}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-neutral-600">Belum ada transaksi yang tercatat.</p>
          ) : (
            recent.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium text-neutral-900">
                    {it.type === "income" ? "Pemasukan" : "Pengeluaran"} • {it.category}
                  </div>
                  <div className="text-sm text-neutral-700">
                    {new Date(it.date).toLocaleDateString()} •{" "}
                    {it.amount.toLocaleString(undefined, { style: "currency", currency: "IDR" })}
                  </div>
                  {it.note && <p className="mt-1 text-sm text-neutral-600">{it.note}</p>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}
