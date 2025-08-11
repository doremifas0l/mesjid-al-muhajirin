"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton" // Using Skeleton for loading state

// Define the data structure we expect from our new API
type Totals = { income: number; expense: number; balance: number }
type RecentTransaction = {
  id: string
  type: "income" | "expense"
  amount: number
  category: string
  note?: string
  occured_at: string
}
type FinanceData = {
  totals: Totals
  recent: RecentTransaction[]
  categories: string[]
}

type TimeRange = "monthly" | "yearly" | "all"

export default function FinancePreview() {
  // Centralized state for data, loading, and errors
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for the filters
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua")
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")

  // This useEffect now fetches data from our API whenever a filter changes
  useEffect(() => {
    const fetchFinanceData = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/finance?range=${timeRange}&category=${selectedCategory}`
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error("Gagal mengambil data keuangan dari server.")
        }
        const result = await res.json()
        setData(result.data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFinanceData()
  }, [timeRange, selectedCategory]) // Re-run when either filter changes

  // Loading State UI
  if (loading) {
    return <FinanceSkeleton />
  }

  // Error State UI
  if (error || !data) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16 text-center text-red-600">
        <p>Error: {error || "Data tidak ditemukan."}</p>
      </section>
    )
  }

  // Success State UI
  return (
    <section id="finance" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Keuangan</h2>
          <p className="mt-1 text-sm text-neutral-600">Ringkasan pemasukan, pengeluaran, dan saldo.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="grid w-full sm:w-40 gap-1.5">
            <Label>Filter Waktu</Label>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full sm:w-56 gap-1.5">
            <Label>Filter Kategori</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {data.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total Pemasukan</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-700">
            {data.totals.income.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Pengeluaran</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-700">
            {data.totals.expense.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Saldo</CardTitle></CardHeader>
          <CardContent className={"text-2xl font-semibold " + (data.totals.balance >= 0 ? "text-neutral-900" : "text-rose-700")}>
            {data.totals.balance.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {selectedCategory === "Semua" ? "Transaksi Terbaru" : `Transaksi Terbaru • ${selectedCategory}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recent.length === 0 ? (
            <p className="text-neutral-600">Belum ada transaksi yang tercatat untuk filter ini.</p>
          ) : (
            data.recent.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium text-neutral-900 capitalize">
                    {it.type} • {it.category}
                  </div>
                  <div className="text-sm text-neutral-700">
                    {new Date(it.occured_at).toLocaleDateString("id-ID")} •{" "}
                    {it.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
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

// A helper component for the loading state to keep the main component clean
function FinanceSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="flex justify-between">
        <div className="w-1/3 space-y-2"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
        <div className="flex gap-3"><Skeleton className="h-10 w-40" /><Skeleton className="h-10 w-56" /></div>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="mt-6 h-48 w-full" />
    </section>
  )
}
