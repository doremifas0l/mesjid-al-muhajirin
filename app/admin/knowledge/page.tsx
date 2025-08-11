"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Link as LinkIcon, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Types remain the same
type LinkItem = { url: string; label: string }
type NoteItem = { id: string; title: string; content: string; created_at: string; category_id: string | null; category_name: string | null; links: LinkItem[] | null }
type CategoryItem = { id: string; name: string }

export default function KnowledgeAdminPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [form, setForm] = useState<{ title: string; content: string; category_id: string; links: LinkItem[] }>({ title: "", content: "", category_id: "", links: [] })
  const [currentLink, setCurrentLink] = useState<LinkItem>({ url: "", label: "" })

  useEffect(() => {
    const fetchData = async () => {
      const [notesRes, categoriesRes] = await Promise.all([fetch("/api/notes"), fetch("/api/note-categories")])
      if (notesRes.ok) setNotes((await notesRes.json())?.data || [])
      if (categoriesRes.ok) setCategories((await categoriesRes.json())?.data || [])
    }
    fetchData()
  }, [])

  // --- NEW --- Function to handle creating a new category
  async function handleAddNewCategory() {
    const newCategoryName = window.prompt("Masukkan nama kategori baru:")
    if (!newCategoryName || !newCategoryName.trim()) return

    const res = await fetch("/api/note-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    })

    if (res.ok) {
      const { data: newCategory } = await res.json()
      // Add to local state and auto-select it
      setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)))
      setForm(prev => ({ ...prev, category_id: newCategory.id }))
    } else {
      // Handle errors, like duplicates
      const { error } = await res.json()
      alert(`Gagal menambah kategori: ${error}`)
    }
  }

  const addLinkToForm = () => {
    if (currentLink.url.trim() && currentLink.label.trim()) {
      setForm(prev => ({ ...prev, links: [...prev.links, currentLink] }))
      setCurrentLink({ url: "", label: "" })
    }
  }

  const removeLinkFromForm = (index: number) => {
    setForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))
  }

  async function addNote() {
    const { title, content, category_id, links } = form
    if (!content.trim()) return
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), category_id: category_id || null, links }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setNotes(prev => [data, ...prev])
      setForm({ title: "", content: "", category_id: "", links: [] })
    } else {
      alert("Gagal menyimpan catatan.")
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini?")) return
    const res = await fetch("/api/notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (res.ok) setNotes(prev => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Tambah Basis Pengetahuan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="title">Judul</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Sejarah Masjid"/></div>
            <div className="space-y-1">
              {/* --- MODIFIED --- Label now includes the 'Add New' button */}
              <div className="flex items-center justify-between">
                <Label htmlFor="category">Kategori</Label>
                <Button variant="outline" size="sm" onClick={handleAddNewCategory} className="h-7 text-xs">+ Kategori Baru</Button>
              </div>
              <Select value={form.category_id} onValueChange={(value) => setForm({ ...form, category_id: value })}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori... (opsional)" /></SelectTrigger>
                <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label htmlFor="content">Isi Konten</Label><Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Tulis catatan, ringkasan, atau info penting..." rows={5}/></div>
          
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Tautan Terkait (Opsional)</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1"><Label htmlFor="linkLabel">Label Tautan</Label><Input id="linkLabel" value={currentLink.label} onChange={(e) => setCurrentLink({ ...currentLink, label: e.target.value })} placeholder="Contoh: Video Ceramah"/></div>
              <div className="space-y-1"><Label htmlFor="linkUrl">URL Tautan</Label><Input id="linkUrl" value={currentLink.url} onChange={(e) => setCurrentLink({ ...currentLink, url: e.target.value })} placeholder="https://www.youtube.com/..."/></div>
              <div className="self-end"><Button variant="outline" onClick={addLinkToForm}><LinkIcon className="mr-2 h-4 w-4"/> Tambah Tautan</Button></div>
            </div>
            <div className="space-y-2">
              {form.links.map((link, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-neutral-50 p-2 text-sm">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate pr-2 text-blue-600 hover:underline"><span className="font-semibold">{link.label}:</span> {link.url}</a>
                  <Button variant="ghost" size="icon" onClick={() => removeLinkFromForm(i)} className="h-6 w-6 shrink-0"><X className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>
          
          <div><Button onClick={addNote} className="bg-neutral-900 hover:bg-black"><Plus className="mr-2 h-4 w-4" /> Simpan Catatan</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar Pengetahuan</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {notes.length === 0 && <p className="text-neutral-600 sm:col-span-3">Belum ada catatan.</p>}
          {notes.map((n) => (
            <div key={n.id} className="flex flex-col rounded-lg border bg-white">
              <div className="border-b p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {n.category_name && <Badge variant="secondary" className="mb-2">{n.category_name}</Badge>}
                    <h3 className="truncate font-semibold text-neutral-900">{n.title || "Tanpa Judul"}</h3>
                    <p className="text-xs text-neutral-600">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => deleteNote(n.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex-grow p-4"><p className="whitespace-pre-wrap text-sm text-neutral-800">{n.content}</p></div>
              {n.links && n.links.length > 0 && (
                <div className="border-t p-4">
                  <h5 className="mb-2 text-sm font-semibold">Tautan:</h5>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {n.links.map((link, i) => (
                      <li key={i}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link.label}</a></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
