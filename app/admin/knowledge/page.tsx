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

// Updated types to match our new data structure
type LinkItem = { url: string; label: string }
type NoteItem = {
  id: string
  title: string
  content: string
  created_at: string
  category_id: string | null
  category_name: string | null
  links: LinkItem[] | null
}
type CategoryItem = { id: string; name: string }

export default function KnowledgeAdminPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  
  // Form state now includes category and links
  const [form, setForm] = useState<{ title: string; content: string; category_id: string; links: LinkItem[] }>({
    title: "",
    content: "",
    category_id: "",
    links: [],
  })
  
  // State to manage the link being currently typed
  const [currentLink, setCurrentLink] = useState<LinkItem>({ url: "", label: "" })

  // Fetch both notes and categories when the page loads
  useEffect(() => {
    const fetchData = async () => {
      // Use Promise.all to fetch in parallel for better performance
      const [notesRes, categoriesRes] = await Promise.all([fetch("/api/notes"), fetch("/api/note-categories")])
      
      if (notesRes.ok) {
        const notesJson = await notesRes.json()
        setNotes(notesJson?.data || [])
      }
      if (categoriesRes.ok) {
        const categoriesJson = await categoriesRes.json()
        setCategories(categoriesJson?.data || [])
      }
    }
    fetchData()
  }, [])
  
  // Function to add a link to the form's staging area
  const addLinkToForm = () => {
    if (currentLink.url.trim() && currentLink.label.trim()) {
      setForm(prev => ({ ...prev, links: [...prev.links, currentLink] }))
      setCurrentLink({ url: "", label: "" }) // Reset for the next link
    }
  }

  // Function to remove a link from the staging area
  const removeLinkFromForm = (index: number) => {
    setForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))
  }

  // Main function to save the entire note
  async function addNote() {
    const { title, content, category_id, links } = form
    if (!content.trim()) return

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: title.trim(), 
        content: content.trim(), 
        category_id: category_id || null, 
        links 
      }),
    })

    if (res.ok) {
      const { data } = await res.json()
      setNotes((prev) => [data, ...prev])
      // Reset the entire form
      setForm({ title: "", content: "", category_id: "", links: [] })
    } else {
      alert("Gagal menyimpan catatan.")
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini?")) return
    const res = await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      {/* --- ADD NOTE FORM --- */}
      <Card>
        <CardHeader><CardTitle>Tambah Basis Pengetahuan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="title">Judul</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Sejarah Masjid"/></div>
            <div className="space-y-1"><Label htmlFor="category">Kategori</Label><Select value={form.category_id} onValueChange={(value) => setForm({ ...form, category_id: value })}><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1"><Label htmlFor="content">Isi Konten</Label><Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Tulis catatan, ringkasan, atau info penting..." rows={5}/></div>
          
          {/* Link Management Section */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Tautan Terkait</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1"><Label htmlFor="linkLabel">Label Tautan</Label><Input id="linkLabel" value={currentLink.label} onChange={(e) => setCurrentLink({ ...currentLink, label: e.target.value })} placeholder="Contoh: Video Ceramah"/></div>
              <div className="space-y-1"><Label htmlFor="linkUrl">URL Tautan</Label><Input id="linkUrl" value={currentLink.url} onChange={(e) => setCurrentLink({ ...currentLink, url: e.target.value })} placeholder="https://www.youtube.com/..."/></div>
              <div className="self-end"><Button variant="outline" onClick={addLinkToForm}><LinkIcon className="mr-2 h-4 w-4"/> Tambah Tautan</Button></div>
            </div>
            <div className="space-y-2">
              {form.links.map((link, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-neutral-50 p-2 text-sm">
                  <span className="truncate pr-2"><span className="font-semibold">{link.label}:</span> <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link.url}</a></span>
                  <Button variant="ghost" size="icon" onClick={() => removeLinkFromForm(i)} className="h-6 w-6"><X className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>
          
          <div><Button onClick={addNote} className="bg-neutral-900 hover:bg-black"><Plus className="mr-2 h-4 w-4" /> Simpan Catatan</Button></div>
        </CardContent>
      </Card>

      {/* --- LIST OF NOTES --- */}
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
                    <h3 className="truncate font-semibold text-neutral-900">{n.title}</h3>
                    <p className="text-xs text-neutral-600">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => deleteNote(n.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex-grow p-4">
                <p className="whitespace-pre-wrap text-sm text-neutral-800">{n.content}</p>
              </div>
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
