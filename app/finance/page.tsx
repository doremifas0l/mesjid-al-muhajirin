"use client"

import { useEffect, useState } from "react"
// --- NEW --- Import useRouter
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

// Types and component logic remain the same...
type Transaction = { id: string; type: "income" | "expense"; amount: number; category: string; note?: string; occured_at: string }
type FinanceData = { transactions: Transaction[]; categories: string[]; totalPages: number }
type TimeRange = "monthly" | "yearly" | "all"
type TransactionType = "all" | "income" | "expense"

export default function AllTransactionsPage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // --- NEW --- Get the router instance
  const router = useRouter()

  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua")
  const [transactionType, setTransactionType] = useState<TransactionType>("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          range: timeRange,
          category: selectedCategory,
          type: transactionType,
          page: currentPage.toString(),
        })
        const res = await fetch(`/api/finance/all?${params.toString()}`)
        if (!res.ok) throw new Error("Gagal mengambil data dari server.")
        
        const result = await res.json()
        setData(result.data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [timeRange, selectedCategory, transactionType, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [timeRange, selectedCategory, transactionType])

  if (loading) {
    return <PageSkeleton />
  }

  if (error || !data) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-red-500">Error: {error || "Data tidak dapat dimuat."}</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Laporan Keuangan</h1>
          <p className="mt-1 text-neutral-600">Lihat dan filter semua catatan pemasukan dan pengeluaran.</p>
        </div>
        {/* --- MODIFIED --- Replaced the Link with a functional Back button */}
        <Button variant="outline" onClick={() => router.back()} className="mt-4 sm:mt-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {/* The rest of the component remains the same */}
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
            <SelectContent>{(data.categories || []).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
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
          {(data.transactions || []).length === 0 ? (
            <p className="py-8 text-center text-neutral-600">Tidak ada transaksi yang cocok dengan filter ini.</p>
          ) : (
            (data.transactions || []).map((it) => (
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

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
        </Button>
        <div className="text-sm font-medium text-neutral-700">
          Halaman {currentPage} dari {data.totalPages > 0 ? data.totalPages : 1}
        </div>
        <Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= data.totalPages}>
          Berikutnya <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Skeleton className="h-10 w-1/2" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="mt-6 h-96 w-full" />
    </div>
  )
}
