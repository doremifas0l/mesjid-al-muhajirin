"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Pencil, X, Save } from "lucide-react"
import { useRouter } from "next/navigation"

type FinanceType = "income" | "expense"
type FinanceItem = {
  id: string
  type: FinanceType
  amount: number
  category: string
  note?: string
  date: string // ISO
}

export default function FinanceAdminPage() {
  const router = useRouter()
  // simple client-side auth guard
  useEffect(() => {
    if (typeof window === "undefined") return
    const authed = localStorage.getItem("masjid_admin_authed") === "true"
    if (!authed) router.replace("/login")
  }, [router])

  const [items, setItems] = useState<FinanceItem[]>([])
  const [form, setForm] = useState<{
    type: FinanceType
    amount: string
    category: string
    note: string
    date: string
  }>({
    type: "income",
    amount: "",
    category: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  })

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    type: FinanceType
    amount: string
    category: string
    note: string
    date: string
  }>({
    type: "income",
    amount: "",
    category: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("masjid_finance")
    if (stored) {
      try {
        setItems(JSON.parse(stored) as FinanceItem[])
      } catch {
        setItems([])
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("masjid_finance", JSON.stringify(items))
    }
  }, [items])

  function addItem() {
    const amountNum = Number.parseFloat(form.amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    const entry: FinanceItem = {
      id: crypto.randomUUID(),
      type: form.type,
      amount: amountNum,
      category: form.category.trim() || (form.type === "income" ? "Pemasukan" : "Pengeluaran"),
      note: form.note.trim() || undefined,
      date: new Date(form.date).toISOString(),
    }
    setItems((prev) => [entry, ...prev])
    setForm((f) => ({ ...f, amount: "", category: "", note: "" }))
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function startEdit(it: FinanceItem) {
    setEditingId(it.id)
    setEditForm({
      type: it.type,
      amount: it.amount.toString(),
      category: it.category,
      note: it.note ?? "",
      date: new Date(it.date).toISOString().slice(0, 10),
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(id: string) {
    const amountNum = Number.parseFloat(editForm.amount)
    if (isNaN(amountNum) || amountNum <= 0) return
    const updated: FinanceItem = {
      id,
      type: editForm.type,
      amount: amountNum,
      category: editForm.category.trim() || (editForm.type === "income" ? "Pemasukan" : "Pengeluaran"),
      note: editForm.note.trim() || undefined,
      date: new Date(editForm.date).toISOString(),
    }
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
    setEditingId(null)
  }

  const totals = useMemo(() => {
    const income = items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0)
    const expense = items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    const balance = income - expense
    return { income, expense, balance }
  }, [items])

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Keuangan</h1>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-neutral-900">Tambah Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Jenis</Label>
              <Select value={form.type} onValueChange={(v: FinanceType) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Jumlah</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Kategori</Label>
              <Input
                id="category"
                placeholder="Infak, Operasional, dll."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                placeholder="Keterangan tambahan"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={addItem} className="bg-neutral-900 hover:bg-black">
                <Plus className="mr-2 h-4 w-4" />
                Tambah
              </Button>
            </div>
          </CardContent>
        </Card>

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
            <CardTitle className="text-neutral-900">Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && <p className="text-neutral-600">Belum ada transaksi.</p>}
            {items.map((it) =>
              editingId === it.id ? (
                <div key={it.id} className="rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-5">
                    <div className="space-y-1">
                      <Label>Jenis</Label>
                      <Select
                        value={editForm.type}
                        onValueChange={(v: FinanceType) => setEditForm({ ...editForm, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Pemasukan</SelectItem>
                          <SelectItem value="expense">Pengeluaran</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Jumlah</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Kategori</Label>
                      <Input
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tanggal</Label>
                      <Input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-5">
                      <Label>Catatan</Label>
                      <Textarea
                        value={editForm.note}
                        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 sm:col-span-5">
                      <Button onClick={() => saveEdit(it.id)} className="bg-neutral-900 hover:bg-black">
                        <Save className="mr-2 h-4 w-4" />
                        Simpan
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        <X className="mr-2 h-4 w-4" />
                        Batal
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
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
                  <div className="flex gap-2">
                    <Button variant="secondary" size="icon" onClick={() => startEdit(it)} aria-label="Edit transaksi">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteItem(it.id)}
                      aria-label="Hapus transaksi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
