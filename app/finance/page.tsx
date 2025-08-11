"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Transaction = {
  id: string
  type: "income" | "expense"
  amount: number
  category: string
  note?: string
  occured_at: string
}

export default function AllTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetching from our NEW, dedicated API route
        const res = await fetch("/api/finance/all")
        if (!res.ok) throw new Error("Gagal mengambil data transaksi.")
        
        const result = await res.json()
        setTransactions(result.data || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-center text-red-500">Error: {error}</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
        Semua Transaksi Keuangan
      </h1>
      
      <Card className="mt-6">
        <CardHeader><CardTitle>Daftar Transaksi</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-neutral-600">Belum ada transaksi yang tercatat.</p>
          ) : (
            transactions.map((it) => (
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
    </div>
  )
}
