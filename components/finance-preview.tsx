"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FinanceType = "income" | "expense"

type FinanceItem = {
  id: string
  type: FinanceType
  amount: number
  category: string
  note?: string
  date: string // ISO
}

const CATEGORIES_KEY = "masjid_finance_categories"

export default function FinancePreview() {
  const [items, setItems] = useState<FinanceItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<string>("Semua")

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
        // Also merge any categories present in items
        ;(JSON.parse(raw || "[]") as FinanceItem[]).forEach((i) => allCats.add(i.category))
        setCategories(["Semua", ...Array.from(allCats)])
      } catch {
        setCategories(["Semua"])
      }
    } else {
      // derive from items only
      const setCats = new Set<string>()
      ;(JSON.parse(raw || "[]") as FinanceItem[]).forEach((i) => setCats.add(i.category))
      setCategories(["Semua", ...Array.from(setCats)])
    }
  }, [])

  const filtered = useMemo(() => {
    if (selected === "Semua") return items
    return items.filter((i) => i.category === selected)
  }, [items, selected])

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
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Keuangan</h2>
          <p className="mt-1 text-sm text-neutral-600">Ringkasan pemasukan, pengeluaran, dan saldo.</p>
        </div>
        <div className="w-full sm:w-64">
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
