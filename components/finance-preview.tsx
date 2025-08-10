"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { idrFormatter, shortIdrFormatter } from "@/lib/formatter"

// Types for the expected data from the API
type Rekap = { date: string; amount: number }
type Transaction = { id: string; label: string; amount: number }
type FinanceData = {
  rekap: Rekap[]
  pemasukan: Transaction[]
  pengeluaran: Transaction[]
}

// --- NEW ---
// Define the possible time ranges for type safety
type TimeRange = "monthly" | "yearly" | "all"

export default function FinancePreview() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  
  // --- NEW ---
  // State to manage the selected time range. Default to 'monthly'.
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")

  useEffect(() => {
    // This function will now run whenever 'timeRange' changes.
    const fetchData = async () => {
      // --- MODIFIED ---
      // Set loading to true every time we fetch new data
      setLoading(true)
      setError(false)

      try {
        // Pass the selected timeRange as a query parameter to the API
        const res = await fetch(`/api/finance/rekap?range=${timeRange}`)
        if (!res.ok) throw new Error("Gagal mengambil data")
        const json = await res.json()
        setData(json.data)
      } catch (e) {
        console.error(e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [timeRange]) // --- MODIFIED --- Dependency array now includes 'timeRange'

  const chartData = useMemo(() => {
    if (!data?.rekap) return []
    return data.rekap.map((d) => ({ name: new Date(d.date).toLocaleDateString("id-ID"), amount: d.amount }))
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="text-sm font-bold text-neutral-800">{idrFormatter(payload[0].value)}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <Skeleton className="mb-4 h-6 w-1/3" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="mb-4 h-6 w-1/3" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-red-600">Gagal memuat data. Silakan coba lagi nanti.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {/* --- MODIFIED --- Header now contains the Title and the new Select component */}
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-neutral-900">Ringkasan Keuangan</CardTitle>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pilih rentang waktu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Bulanan</SelectItem>
            <SelectItem value="yearly">Tahunan</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={shortIdrFormatter} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="url(#colorAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-neutral-800">Pemasukan Terbaru</h3>
            <div className="space-y-3">
              {data.pemasukan.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <p className="min-w-0 truncate pr-2 text-sm text-neutral-700">{item.label}</p>
                  <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                    {idrFormatter(item.amount)}
                  </Badge>
                </div>
              ))}
              {data.pemasukan.length === 0 && <p className="text-sm text-neutral-500">Tidak ada data.</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-neutral-800">Pengeluaran Terbaru</h3>
            <div className="space-y-3">
              {data.pengeluaran.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <p className="min-w-0 truncate pr-2 text-sm text-neutral-700">{item.label}</p>
                  <Badge variant="destructive" className="bg-rose-100 text-rose-800 hover:bg-rose-200">
                    {idrFormatter(item.amount)}
                  </Badge>
                </div>
              ))}
              {data.pengeluaran.length === 0 && <p className="text-sm text-neutral-500">Tidak ada data.</p>}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href="/admin/finance">Lihat Laporan Lengkap</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
