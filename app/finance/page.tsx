"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

// Updated data structure from our API
type Totals = { income: number; expense: number; balance: number }
type Transaction = {
  id: string
  type: "income" | "expense"
  amount: number
  category: string
  note?: string
  occured_at: string
}
type FinanceData = {
  totals: Totals
  transactions: Transaction[]
  categories: string[]
  count: number
}

type TimeRange = "monthly" | "yearly" | "all"
type TransactionType = "all" | "income" | "expense"

const ITEMS_PER_PAGE = 10 // Must match the backend

export default function AllTransactionsPage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // All our filters
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua")
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")
  const [transactionType, setTransactionType] = useState<TransactionType>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // This useEffect fetches data from our API whenever any filter changes
  useEffect(() => {
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
        const res = await fetch(`/api/finance?${params.toString()}`)
        if (!res.ok) throw new Error("Gagal mengambil data dari server.")
        const result = await res.json()
        setData(result.data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchFinanceData()
  }, [timeRange, selectedCategory, transactionType, currentPage])

  // Reset to page 1 if any filter *other than* the page number changes
  useEffect(() => {
    setCurrentPage(1)
  }, [timeRange, selectedCategory, transactionType])

  const totalPages = data ? Math.ceil(data.count / ITEMS_PER_PAGE) : 0

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
  
  if (error || !data) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-center text-red-500">Error: {error || "Data tidak ditemukan."}</div>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Semua Transaksi Keuangan</h1>
          <p className="mt-1 text-neutral-600">Lihat dan filter semua catatan pemasukan dan pengeluaran.</p>
        </div>
        <Button asChild variant="outline" className="mt-4 sm:mt-0">
            <Link href="/">Kembali ke Beranda</Link>
        </Button>
      </div>

      {/* Filter Controls */}
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
            <SelectContent>{data.categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
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

      {/* Transaction List */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Daftar Transaksi</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.transactions.length === 0 ? (
            <p className="text-center text-neutral-600 py-8">Tidak ada transaksi yang cocok dengan filter ini.</p>
          ) : (
            data.transactions.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className={`font-medium capitalize ${it.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {it.type} • {it.category}
                  </div>
                  <div className="text-sm text-neutral-700">
                    {new Date(it.occured_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {it.note && <p className="mt-1 text-sm text-neutral-600">{it.note}</p>}
                </div>
                <div className={`text-lg font-semibold ${it.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {it.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
        </Button>
        <div className="text-sm font-medium text-neutral-700">
          Halaman {currentPage} dari {totalPages > 0 ? totalPages : 1}
        </div>
        <Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>
          Berikutnya <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
