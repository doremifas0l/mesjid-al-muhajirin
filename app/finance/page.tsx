"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

type Totals = { income: number; expense: number; balance: number }
type Transaction = {
  id?: string
  type?: "income" | "expense"
  amount?: number | string
  category?: string
  note?: string
  occured_at?: string
}
type FinanceData = {
  totals: Totals
  transactions: Transaction[]
  categories: string[]
  count: number
}

type TimeRange = "monthly" | "yearly" | "all"
type TransactionType = "all" | "income" | "expense"

const ITEMS_PER_PAGE = 10

// Basic ErrorBoundary to catch render-time errors and print helpful logs
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught:", error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-6xl px-4 py-8 text-red-600">
          Terjadi kesalahan saat menampilkan halaman: {String(this.state.error)}
        </div>
      )
    }
    return this.props.children as any
  }
}

export default function AllTransactionsPage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua")
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")
  const [transactionType, setTransactionType] = useState<TransactionType>("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const ac = new AbortController()
    const fetchFinanceData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          range: timeRange,
          category: selectedCategory,
          type: transactionType,
          page: currentPage.toString(),
        })
        const res = await fetch(`/api/finance?${params.toString()}`, { signal: ac.signal })
        if (!res.ok) {
          const txt = await res.text().catch(() => "")
          throw new Error("Gagal mengambil data dari server." + (txt ? ` (${txt})` : ""))
        }
        const result = await res.json()

        // -- Defensive normalization --
        if (!result || !result.data) {
          // if server returns unexpected shape, set safe empty data
          const safe: FinanceData = {
            totals: { income: 0, expense: 0, balance: 0 },
            transactions: [],
            categories: ["Semua"],
            count: 0,
          }
          setData(safe)
          throw new Error("Format data dari server tidak valid.")
        }

        const d = result.data
        const safeData: FinanceData = {
          totals: {
            income: typeof d.totals?.income === "number" ? d.totals.income : Number(d.totals?.income) || 0,
            expense: typeof d.totals?.expense === "number" ? d.totals.expense : Number(d.totals?.expense) || 0,
            balance: typeof d.totals?.balance === "number" ? d.totals.balance : Number(d.totals?.balance) || 0,
          },
          transactions: Array.isArray(d.transactions) ? d.transactions : [],
          categories: Array.isArray(d.categories) ? d.categories : ["Semua"],
          count: typeof d.count === "number" ? d.count : 0,
        }

        setData(safeData)
      } catch (e: any) {
        if (e?.name === "AbortError") return
        console.error("Fetch error:", e)
        setError(e?.message ?? "Unknown error")
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchFinanceData()
    return () => ac.abort()
  }, [timeRange, selectedCategory, transactionType, currentPage])

  // when filters change, reset page
  useEffect(() => {
    setCurrentPage(1)
  }, [timeRange, selectedCategory, transactionType])

  // Derive safe arrays for rendering
  const transactions = Array.isArray(data?.transactions) ? data!.transactions : []
  const categories = Array.isArray(data?.categories) ? data!.categories : ["Semua"]
  const safeCount = typeof data?.count === "number" ? data!.count : 0
  const totalPages = Math.max(1, Math.ceil(safeCount / ITEMS_PER_PAGE))

  const prevPage = () => setCurrentPage((p) => Math.max(1, p - 1))
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1))

  // Loading UI
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="mt-2 h-6 w-1/2" />
        <div className="mt-6 flex gap-4"><Skeleton className="h-12 w-52" /><Skeleton className="h-12 w-52" /><Skeleton className="h-12 w-52" /></div>
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-center text-red-500">Error: {error}</div>
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Semua Transaksi Keuangan</h1>
            <p className="mt-1 text-neutral-600">Lihat dan filter semua catatan pemasukan dan pengeluaran.</p>
          </div>

          {/* simpler Link as button to avoid any asChild/Slot edge-cases */}
          <Link href="/" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50">
            Kembali ke Beranda
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="grid w-full gap-1.5">
            <Label>Filter Waktu</Label>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-full gap-1.5">
            <Label>Filter Kategori</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={String(c)} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-full gap-1.5">
            <Label>Filter Tipe</Label>
            <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Daftar Transaksi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-neutral-600 py-8">Tidak ada transaksi yang cocok dengan filter ini.</p>
            ) : (
              transactions.map((it, idx) => {
                if (!it || typeof it !== "object") return null
                const id = it.id ?? `txn-${idx}`
                const type = it.type === "income" ? "income" : "expense"
                const amount = typeof it.amount === "number" ? it.amount : Number(it.amount) || 0
                const category = it.category ?? "Unknown"
                const occured = it.occured_at ? new Date(it.occured_at) : null
                return (
                  <div key={id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className={`font-medium capitalize ${type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {type} • {category}
                      </div>
                      <div className="text-sm text-neutral-700">
                        {occured ? occured.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                      </div>
                      {it.note && <p className="mt-1 text-sm text-neutral-600">{it.note}</p>}
                    </div>
                    <div className={`text-lg font-semibold ${type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" onClick={prevPage} disabled={currentPage === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
          </Button>
          <div className="text-sm font-medium text-neutral-700">
            Halaman {currentPage} dari {totalPages}
          </div>
          <Button variant="outline" onClick={nextPage} disabled={currentPage >= totalPages}>
            Berikutnya <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  )
}
