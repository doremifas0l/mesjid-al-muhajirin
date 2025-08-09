"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
// --- THE FIX IS HERE: Using a relative path ---
import { supabase } from "../../../lib/supabase-client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Pencil, X, Save, Tag } from "lucide-react"

// This type now matches the database schema more closely
type FinanceTransaction = {
  id: string
  occured_at: string // The field in your database
  amount: number
  type: "income" | "expense"
  category: string // Assuming a simple text column for category for now
  note: string | null
  created_at: string
}

type FormType = "income" | "expense"

const CATEGORIES_KEY = "masjid_finance_categories"
const DEFAULT_CATEGORIES = ["Keuangan Masjid", "Qurban", "Infak", "Operasional", "Pendidikan"]

export default function FinanceAdminPage() {
  const router = useRouter()
  // simple client-side auth guard (can be replaced with Supabase Auth later)
  useEffect(() => {
    if (typeof window === "undefined") return
    const authed = localStorage.getItem("masjid_admin_authed") === "true"
    if (!authed) router.replace("/login")
  }, [router])

  const [items, setItems] = useState<FinanceTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: "income" as FormType,
    amount: "",
    category: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  })

  // Edit state remains the same
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    type: "income" as FormType,
    amount: "",
    category: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  })

  // Category management can remain in localStorage for simplicity
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [newCategory, setNewCategory] = useState("")

  // --- NEW: Function to fetch data from Supabase ---
  async function fetchTransactions() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("*")
      .order("occured_at", { ascending: false })

    if (error) {
      console.error("Error fetching transactions:", error)
      setError("Gagal memuat data transaksi. Coba muat ulang halaman.")
      setItems([])
    } else {
      setItems(data as FinanceTransaction[])
    }
    setLoading(false)
  }

  // --- MODIFIED: Load data from Supabase on mount ---
  useEffect(() => {
    fetchTransactions()

    // Category loading from localStorage is fine
    const catRaw = localStorage.getItem(CATEGORIES_KEY)
    if (catRaw) {
      try {
        const parsed = JSON.parse(catRaw) as string[]
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]))
        setCategories(merged)
      } catch {
        setCategories(DEFAULT_CATEGORIES)
      }
    }
  }, [])

  // Persist categories (optional)
  useEffect(() => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  }, [categories])

  // --- MODIFIED: All CRUD operations are now async and talk to Supabase ---
  async function addItem() {
    const amountNum = Number.parseFloat(form.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Jumlah harus angka yang valid.")
      return
    }

    const { error } = await supabase.from("finance_transactions").insert({
      occured_at: new Date(form.date).toISOString(),
      amount: amountNum,
      type: form.type,
      note: form.note.trim() || null,
      category: form.category.trim() || (form.type === "income" ? "Pemasukan Lain" : "Pengeluaran Lain"),
    })

    if (error) {
      alert("Gagal menambahkan transaksi: " + error.message)
    } else {
      setForm((f) => ({ ...f, amount: "", category: "", note: "" }))
      fetchTransactions() // Reload the list from the database
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return

    const { error } = await supabase.from("finance_transactions").delete().match({ id })

    if (error) {
      alert("Gagal menghapus transaksi: " + error.message)
    } else {
      fetchTransactions() // Reload the list
    }
  }

  function startEdit(it: FinanceTransaction) {
    setEditingId(it.id)
    setEditForm({
      type: it.type,
      amount: it.amount.toString(),
      category: it.category,
      note: it.note ?? "",
      date: new Date(it.occured_at).toISOString().slice(0, 10),
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    const amountNum = Number.parseFloat(editForm.amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    const { error } = await supabase.from("finance_transactions").update({
      occured_at: new Date(editForm.date).toISOString(),
      amount: amountNum,
      type: editForm.type,
      category: editForm.category.trim() || (editForm.type === "income" ? "Pemasukan Lain" : "Pengeluaran Lain"),
      note: editForm.note.trim() || null,
    }).match({ id })

    if (error) {
      alert("Gagal menyimpan perubahan: " + error.message)
    } else {
      setEditingId(null)
      fetchTransactions() // Reload the list
    }
  }

  const totals = useMemo(() => {
    const income = items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0)
    const expense = items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    const balance = income - expense
    return { income, expense, balance }
  }, [items])

  // Category management functions can remain the same
  function addCategory() {
    const name = newCategory.trim()
    if (!name || categories.includes(name)) return
    setCategories((prev) => [...prev, name])
    setNewCategory("")
  }

  function deleteCategory(name: string) {
    const isUsed = items.some((i) => i.category === name)
    if (isUsed) {
      alert("Kategori sedang digunakan dan tidak bisa dihapus.")
      return
    }
    setCategories((prev) => prev.filter((c) => c !== name))
  }
  
  // --- NEW: Loading and Error UI states ---
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Memuat data keuangan...</div>
  }
  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-600">{error}</div>
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* The entire JSX for your form and display remains the same as your original code */}
        {/* It will now be populated by the `items` state from the database */}
        
        {/* ADD TRANSACTION CARD... */}
        {/* TOTALS CARDS... */}
        {/* CATEGORY MANAGER CARD... */}
        {/* TRANSACTION LIST... */}
        
        {/* I am pasting your original JSX structure below for completeness */}

        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Keuangan</h1>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-neutral-900">Tambah Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Jenis</Label>
              <Select value={form.type} onValueChange={(v: FormType) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Jumlah</Label>
              <Input id="amount" type="number" inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/>
            </div>
            <div className="space-y-1">
              <Label>Kategori Cepat</Label>
              <Select onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori cepat" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Kategori (ketik manual bila perlu)</Label>
              <Input id="category" placeholder="Infak, Keuangan Masjid, Qurban, dll." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Tanggal</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="note">Catatan</Label>
              <Textarea id="note" placeholder="Keterangan tambahan" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}/>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={addItem} className="bg-neutral-900 hover:bg-black"><Plus className="mr-2 h-4 w-4" />Tambah</Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-neutral-900">Total Pemasukan</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold text-emerald-700">{totals.income.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-neutral-900">Total Pengeluaran</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold text-rose-700">{totals.expense.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-neutral-900">Saldo</CardTitle></CardHeader>
            <CardContent className={"text-2xl font-semibold " + (totals.balance >= 0 ? "text-neutral-900" : "text-rose-700")}>{totals.balance.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-neutral-900"><Tag className="h-4 w-4" />Kelola Kategori</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input placeholder="Tambah kategori baru..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)}/>
              </div>
              <Button onClick={addCategory} className="bg-neutral-900 hover:bg-black"><Plus className="mr-2 h-4 w-4" />Tambah Kategori</Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((c) => {
                const isUsed = items.some((i) => i.category === c);
                return (
                  <div key={c} className="flex items-center justify-between rounded-md border p-2">
                    <span>{c}</span>
                    <Button variant="destructive" size="icon" onClick={() => deleteCategory(c)} title={isUsed ? "Kategori sedang digunakan" : "Hapus kategori"} disabled={isUsed}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-neutral-900">Daftar Transaksi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && <p className="text-neutral-600">Belum ada transaksi.</p>}
            {items.map((it) =>
              editingId === it.id ? (
                // EDITING FORM JSX
                <div key={it.id} className="rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-5">
                    {/* ... form fields for editing ... */}
                    <div className="flex gap-2 sm:col-span-5">
                      <Button onClick={() => saveEdit(it.id)} className="bg-neutral-900 hover:bg-black"><Save className="mr-2 h-4 w-4" />Simpan</Button>
                      <Button variant="outline" onClick={cancelEdit}><X className="mr-2 h-4 w-4" />Batal</Button>
                    </div>
                  </div>
                </div>
              ) : (
                // DISPLAY ROW JSX
                <div key={it.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div>
                    <div className="font-medium text-neutral-900">{it.type === "income" ? "Pemasukan" : "Pengeluaran"} • {it.category}</div>
                    <div className="text-sm text-neutral-700">{new Date(it.occured_at).toLocaleDateString("id-ID")} • {it.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</div>
                    {it.note && <p className="mt-1 text-sm text-neutral-600">{it.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="icon" onClick={() => startEdit(it)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => deleteItem(it.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
