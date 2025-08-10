"use client"

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The data structure returned by your API
type FinanceTransaction = {
  id: string
  occured_at: string
  amount: number
  type: "income" | "expense"
  category: string
  note: string | null
}

export default function KeuanganPage() {
  const [items, setItems] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch data from your internal API route
        const response = await fetch('/api/finance/transactions');
        if (!response.ok) {
          throw new Error('Gagal mengambil data dari server.');
        }
        const result = await response.json();
        setItems(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totals = useMemo(() => {
    const income = items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
    const expense = items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [items]);

  if (loading) {
    return <div className="p-8 text-center">Memuat data keuangan...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Keuangan</h1>
      <p className="text-neutral-600">Ringkasan pemasukan, pengeluaran, dan saldo.</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-neutral-900">Total Pemasukan</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-700">
            {totals.income.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-neutral-900">Total Pengeluaran</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-700">
            {totals.expense.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-neutral-900">Saldo</CardTitle></CardHeader>
          <CardContent className={"text-2xl font-semibold " + (totals.balance >= 0 ? "text-neutral-900" : "text-rose-700")}>
            {totals.balance.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-neutral-900">Transaksi Terbaru</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-neutral-600">Belum ada transaksi yang tercatat.</p>
          ) : (
            items.slice(0, 10).map((it) => ( // Show latest 10 transactions
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="font-medium text-neutral-900">{it.type === "income" ? "Pemasukan" : "Pengeluaran"} • {it.category}</div>
                  <div className="text-sm text-neutral-700">{new Date(it.occured_at).toLocaleDateString("id-ID")} • {it.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</div>
                  {it.note && <p className="mt-1 text-sm text-neutral-600">{it.note}</p>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
