"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Link as LinkIcon, X, Loader2, Sparkles, UploadCloud, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type LinkItem = { url: string; label: string; path?: string; type: 'link' | 'file' }
type NoteItem = { id: string; title: string; content: string; created_at: string; category_id: string | null; category_name: string | null; links: LinkItem[] | null }
type CategoryItem = { id: string; name: string }

const CREATE_NEW_CATEGORY_VALUE = "CREATE_NEW"

export default function KnowledgeAdminPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [form, setForm] = useState<{ title: string; content: string; category_id: string; links: LinkItem[] }>({ title: "", content: "", category_id: "", links: [] })
  const [currentLink, setCurrentLink] = useState<{ url: string; label: string }>({ url: "", label: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingWithAi, setIsSavingWithAi] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [notesRes, categoriesRes] = await Promise.all([fetch("/api/notes"), fetch("/api/note-categories")])
      if (notesRes.ok) setNotes((await notesRes.json())?.data || [])
      if (categoriesRes.ok) setCategories((await categoriesRes.json())?.data || [])
    }
    fetchData()
  }, [])
  
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setIsUploading(true)
    const formData = new FormData(); formData.append("file", file);
    try {
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Gagal mengunggah file.")
      const { publicUrl, path } = await res.json()
      setForm(prev => ({ ...prev, links: [...prev.links, { url: publicUrl, label: file.name, path, type: 'file' }] }))
    } catch (e: any) { alert(e.message) }
    finally { setIsUploading(false); event.target.value = "" }
  }

  async function handleAddNewCategory() {
    const newCategoryName = window.prompt("Masukkan nama kategori baru:"); if (!newCategoryName?.trim()) return;
    const res = await fetch("/api/note-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategoryName.trim() }) })
    if (res.ok) {
      const { data: newCategory } = await res.json()
      // Also update the main category list
      setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)))
      setForm(prev => ({ ...prev, category_id: newCategory.id }))
    } else { const { error } = await res.json(); alert(`Gagal menambah kategori: ${error}`) }
  }
  
  function handleCategoryChange(value: string) {
    if (value === CREATE_NEW_CATEGORY_VALUE) handleAddNewCategory()
    else setForm(prev => ({ ...prev, category_id: value }))
  }

  const addLinkToForm = () => {
    if (currentLink.url.trim() && currentLink.label.trim()) {
      setForm(prev => ({ ...prev, links: [...prev.links, { ...currentLink, type: 'link' }] }))
      setCurrentLink({ url: "", label: "" })
    }
  }

  const removeLinkFromForm = (index: number) => {
    setForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))
  }

  async function addNote() {
    const { title, content, links } = form
    if (!title.trim()) { alert("Judul tidak boleh kosong."); return }
    if (!content.trim() && links.length === 0) { alert("Harap isi Konten atau tambahkan setidaknya satu Tautan/File."); return }
    if (isSaving || isSavingWithAi) return

    setIsSaving(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), content: form.content.trim(), category_id: form.category_id || null, links: form.links }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setNotes(prev => [data, ...prev])
        setForm({ title: "", content: "", category_id: "", links: [] })
        alert("Catatan berhasil disimpan!")
      } else {
        const { error } = await res.json()
        alert(`Gagal menyimpan catatan: ${error || "Unknown error"}`)
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi.")
    } finally {
      setIsSaving(false)
    }
  }
  
  // --- THIS IS THE IMPLEMENTED AI FUNCTION ---
  async function addNoteWithAi() {
    const { title, content, links } = form;
    if (!title.trim()) { alert("Judul tidak boleh kosong untuk diproses oleh AI."); return; }
    if (!content.trim()) { alert("Isi Konten tidak boleh kosong untuk diproses oleh AI."); return; }
    if (isSaving || isSavingWithAi) return;

    setIsSavingWithAi(true);
    try {
      const res = await fetch("/api/knowledge/ai-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, links }),
      });

      if (res.ok) {
        const { data } = await res.json()
        setNotes(prev => [data, ...prev])
        // If AI created a new category, we should update our category list
        const categoryExists = categories.some(c => c.id === data.category_id);
        if (!categoryExists && data.category_id) {
            setCategories(prev => [...prev, { id: data.category_id, name: data.category_name }].sort((a,b) => a.name.localeCompare(b.name)));
        }
        setForm({ title: "", content: "", category_id: "", links: [] })
        alert("Catatan berhasil diproses dan disimpan dengan AI!")
      } else {
        const { error } = await res.json()
        alert(`Gagal memproses dengan AI: ${error || "Unknown error"}`)
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi saat memproses dengan AI.");
    } finally {
      setIsSavingWithAi(false);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini?")) return
    const res = await fetch("/api/notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (res.ok) setNotes(prev => prev.filter((n) => n.id !== id))
    else alert("Gagal menghapus catatan.")
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Tambah Basis Pengetahuan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="title">Judul (wajib)</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Sejarah Masjid"/></div>
            <div className="space-y-1"><Label htmlFor="category">Kategori</Label><Select value={form.category_id} onValueChange={handleCategoryChange}><SelectTrigger><SelectValue placeholder="Pilih kategori... (opsional)" /></SelectTrigger><SelectContent><SelectItem value={CREATE_NEW_CATEGORY_VALUE} className="font-semibold text-blue-600">+ Buat Kategori Baru...</SelectItem>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1"><Label htmlFor="content">Isi Konten (opsional jika ada tautan/file)</Label><Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Tulis catatan, ringkasan, atau info penting..." rows={5}/></div>
          
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Tautan & File Terkait (opsional jika ada konten)</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
              <div className="space-y-1"><Label htmlFor="linkLabel">Label Tautan</Label><Input id="linkLabel" value={currentLink.label} onChange={(e) => setCurrentLink({ ...currentLink, label: e.target.value })} placeholder="Contoh: Video Ceramah"/></div>
              <div className="space-y-1"><Label htmlFor="linkUrl">URL Tautan</Label><Input id="linkUrl" value={currentLink.url} onChange={(e) => setCurrentLink({ ...currentLink, url: e.target.value })} placeholder="https://www.youtube.com/..."/></div>
              <Button variant="outline" onClick={addLinkToForm}><LinkIcon className="mr-2 h-4 w-4"/> Tambah Tautan</Button>
            </div>
            <div className="border-t pt-3">
              <Button asChild variant="outline" className="w-full sm:w-auto" disabled={isUploading}>
                <Label>
                  {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Mengunggah...</> : <><UploadCloud className="mr-2 h-4 w-4"/> Unggah File (PDF, Teks)</>}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.md" disabled={isUploading}/>
                </Label>
              </Button>
            </div>
            <div className="space-y-2">
              {form.links.map((link, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-neutral-50 p-2 text-sm">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 truncate pr-2 text-blue-600 hover:underline">
                    {link.type === 'file' ? <FileText className="h-4 w-4 shrink-0"/> : <LinkIcon className="h-4 w-4 shrink-0"/>}
                    <span className="font-semibold">{link.label}:</span> {link.url}
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => removeLinkFromForm(i)} className="h-6 w-6 shrink-0"><X className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={addNote} disabled={isSaving || isSavingWithAi} className="bg-neutral-900 hover:bg-black w-32">{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><Plus className="mr-2 h-4 w-4" /> Simpan</>}</Button>
            <Button onClick={addNoteWithAi} disabled={isSaving || isSavingWithAi} variant="ghost" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 w-44">{isSavingWithAi ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : <><Sparkles className="mr-2 h-4 w-4" /> Simpan Dengan AI</>}</Button>
          </div>
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
                  <div className="min-w-0">{n.category_name && <Badge variant="secondary" className="mb-2">{n.category_name}</Badge>}<h3 className="truncate font-semibold text-neutral-900">{n.title || "Tanpa Judul"}</h3><p className="text-xs text-neutral-600">{new Date(n.created_at).toLocaleString("id-ID")}</p></div>
                  <Button variant="destructive" size="icon" onClick={() => deleteNote(n.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex-grow p-4"><p className="whitespace-pre-wrap text-sm text-neutral-800">{n.content}</p></div>
              {n.links && n.links.length > 0 && (
                <div className="border-t p-4">
                  <h5 className="mb-2 text-sm font-semibold">Tautan & File:</h5>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {n.links.map((link, i) => (
                      <li key={i}><a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
                        {link.type === 'file' ? <FileText className="h-3 w-3"/> : <LinkIcon className="h-3 w-3"/>} {link.label}
                      </a></li>
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
