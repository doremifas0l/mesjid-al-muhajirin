"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch" // Import the Switch component
import { Trash2, Plus, Link as LinkIcon, X, Loader2, Sparkles, UploadCloud, FileText, Edit, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// --- MODIFIED TYPES ---
type LinkItem = { url: string; label: string; path?: string; type: 'link' | 'file' }
type NoteItem = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    category_id: string | null;
    category_name: string | null;
    links: LinkItem[] | null;
    public: boolean | null;      // NEW
    image_url: string | null;    // NEW
    image_path: string | null;   // NEW
}
type CategoryItem = { id: string; name: string }

const CREATE_NEW_CATEGORY_VALUE = "CREATE_NEW"

export default function KnowledgeAdminPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  // --- MODIFIED FORM STATE ---
  const [form, setForm] = useState<{
    title: string;
    content: string;
    category_id: string;
    links: LinkItem[];
    public: boolean;
    image_url: string;
    image_path: string;
  }>({
    title: "",
    content: "",
    category_id: "",
    links: [],
    public: true, // Default to public
    image_url: "",
    image_path: "",
  })

  const [currentLink, setCurrentLink] = useState<{ url: string; label: string }>({ url: "", label: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingWithAi, setIsSavingWithAi] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [notesRes, categoriesRes] = await Promise.all([fetch("/api/notes"), fetch("/api/note-categories")])
      if (notesRes.ok) setNotes((await notesRes.json())?.data || [])
      if (categoriesRes.ok) setCategories((await categoriesRes.json())?.data || [])
    }
    fetchData()
  }, [])

  // --- NEW: IMAGE UPLOAD HANDLER ---
  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>, context: 'new' | 'edit') {
    const file = event.target.files?.[0]; if (!file) return;

    const currentImagePath = context === 'new' ? form.image_path : editingNote?.image_path;

    setIsUploading(true);
    const formData = new FormData(); formData.append("file", file);

    try {
        const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Gagal mengunggah gambar.");
        const { publicUrl, path } = await res.json();

        // If an old image existed, delete it from storage
        if (currentImagePath) {
            await fetch("/api/storage/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: currentImagePath })
            });
        }
        
        if (context === 'new') {
            setForm(prev => ({ ...prev, image_url: publicUrl, image_path: path }));
        } else if (editingNote) {
            setEditingNote(prev => prev ? { ...prev, image_url: publicUrl, image_path: path } : null);
        }

    } catch (e: any) { alert(e.message); }
    finally { setIsUploading(false); event.target.value = ""; }
  }
  
  // --- NEW: IMAGE REMOVAL HANDLER ---
  async function removeImage(context: 'new' | 'edit') {
      const imagePathToRemove = context === 'new' ? form.image_path : editingNote?.image_path;
      if (!imagePathToRemove) return;
      if (!confirm("Apakah Anda yakin ingin menghapus gambar ini?")) return;

      try {
          const res = await fetch("/api/storage/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: imagePathToRemove })
          });
          if (!res.ok) throw new Error("Gagal menghapus gambar dari storage.");

          if (context === 'new') {
              setForm(prev => ({ ...prev, image_url: "", image_path: "" }));
          } else {
              setEditingNote(prev => prev ? { ...prev, image_url: null, image_path: null } : null);
          }
      } catch (e: any) { alert(e.message); }
  }

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
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
      if (editingNote) {
        setEditingNote(prev => prev ? { ...prev, category_id: newCategory.id } : null)
      } else {
        setForm(prev => ({ ...prev, category_id: newCategory.id }))
      }
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

  // --- MODIFIED addNote FUNCTION ---
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
        body: JSON.stringify({
            title: form.title.trim(),
            content: form.content.trim(),
            category_id: form.category_id || null,
            links: form.links,
            public: form.public,
            image_url: form.image_url || null,
            image_path: form.image_path || null
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setNotes(prev => [data, ...prev])
        // Reset the form completely
        setForm({ title: "", content: "", category_id: "", links: [], public: true, image_url: "", image_path: "" })
        alert("Catatan berhasil disimpan!")
      } else {
        const { error } = await res.json()
        alert(`Gagal menyimpan catatan: ${error || "Unknown error"}`)
      }
    } catch (e) { alert("Terjadi kesalahan koneksi.") }
    finally { setIsSaving(false) }
  }

  // --- MODIFIED addNoteWithAi FUNCTION ---
  async function addNoteWithAi() {
    const { title, content, links } = form;
    if (!title.trim()) { alert("Judul tidak boleh kosong untuk diproses oleh AI."); return; }
    if (!content.trim() && links.length === 0) { alert("Harap isi Konten atau tambahkan Tautan/File untuk diproses oleh AI."); return; }
    if (isSaving || isSavingWithAi) return;

    setIsSavingWithAi(true);
    try {
      const res = await fetch("/api/knowledge/ai-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title,
            content,
            links,
            public: form.public,
            image_url: form.image_url || null,
            image_path: form.image_path || null
        }),
      });

      if (res.ok) {
        const { data } = await res.json()
        setNotes(prev => [data, ...prev])
        const categoryExists = categories.some(c => c.id === data.category_id);
        if (!categoryExists && data.category_id) {
          setCategories(prev => [...prev, { id: data.category_id, name: data.category_name }].sort((a, b) => a.name.localeCompare(b.name)));
        }
        // Reset the form completely
        setForm({ title: "", content: "", category_id: "", links: [], public: true, image_url: "", image_path: "" })
        alert("Catatan berhasil diproses dan disimpan dengan AI!")
      } else {
        const { error } = await res.json()
        alert(`Gagal memproses dengan AI: ${error || "Unknown error"}`)
      }
    } catch (e) { alert("Terjadi kesalahan koneksi saat memproses dengan AI."); }
    finally { setIsSavingWithAi(false); }
  }

  async function deleteNote(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini?")) return
    const noteToDelete = notes.find(n => n.id === id);
    // Also delete the associated image from storage
    if (noteToDelete?.image_path) {
        await fetch("/api/storage/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: noteToDelete.image_path })
        });
    }
    const res = await fetch("/api/notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (res.ok) setNotes(prev => prev.filter((n) => n.id !== id))
    else alert("Gagal menghapus catatan.")
  }

  // --- MODIFIED handleUpdateNote FUNCTION ---
  async function handleUpdateNote() {
    if (!editingNote) return;
    if (!editingNote.title.trim()) { alert("Judul tidak boleh kosong."); return; }
    
    setIsUpdating(true);
    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingNote.id,
          title: editingNote.title,
          content: editingNote.content,
          category_id: editingNote.category_id,
          public: editingNote.public, // NEW
          image_url: editingNote.image_url, // NEW
          image_path: editingNote.image_path, // NEW
        }),
      });

      if (res.ok) {
        const { data: updatedNote } = await res.json();
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
        setEditingNote(null);
        alert("Catatan berhasil diperbarui!");
      } else {
        const { error } = await res.json();
        alert(`Gagal memperbarui catatan: ${error || "Unknown error"}`);
      }
    } catch (e) { alert("Terjadi kesalahan koneksi saat memperbarui."); }
    finally { setIsUpdating(false); }
  }

  return (
    <div className="space-y-8">
      {/* Add New Knowledge Card */}
      <Card>
        <CardHeader><CardTitle>Tambah Basis Pengetahuan</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="title">Judul (wajib)</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Sejarah Masjid" /></div>
            <div className="space-y-1"><Label htmlFor="category">Kategori</Label><Select value={form.category_id} onValueChange={handleCategoryChange}><SelectTrigger><SelectValue placeholder="Pilih kategori... (opsional)" /></SelectTrigger><SelectContent><SelectItem value={CREATE_NEW_CATEGORY_VALUE} className="font-semibold text-blue-600">+ Buat Kategori Baru...</SelectItem>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1"><Label htmlFor="content">Isi Konten (opsional jika ada tautan/file)</Label><Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Tulis catatan, ringkasan, atau info penting..." rows={5} /></div>

          {/* --- NEW: IMAGE UPLOAD UI --- */}
          <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-medium">Gambar Utama</h4>
              {form.image_url && (
                  <div className="relative w-full max-w-sm">
                      <img src={form.image_url} alt="Preview" className="h-auto w-full rounded-md border" />
                      <Button variant="destructive" size="icon" onClick={() => removeImage('new')} className="absolute right-2 top-2 h-7 w-7 opacity-80 hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              )}
              <Button asChild variant="outline" className="w-full sm:w-auto" disabled={isUploading}>
                  <Label className="cursor-pointer">
                      {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...</> : <><ImageIcon className="mr-2 h-4 w-4" /> {form.image_url ? 'Ganti Gambar' : 'Unggah Gambar'}</>}
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'new')} accept="image/png, image/jpeg, image/webp" disabled={isUploading} />
                  </Label>
              </Button>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Tautan & File Terkait</h4>
            {/* ... link and file upload UI (unchanged) ... */}
          </div>

          {/* --- NEW: VISIBILITY TOGGLE --- */}
          <div className="flex items-center space-x-3 rounded-lg border p-4">
              <Switch id="public-toggle" checked={form.public} onCheckedChange={(checked) => setForm({ ...form, public: checked })} />
              <Label htmlFor="public-toggle" className="cursor-pointer">Tampilkan ke Publik</Label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={addNote} disabled={isSaving || isSavingWithAi} className="bg-neutral-900 hover:bg-black w-full sm:w-32">{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><Plus className="mr-2 h-4 w-4" /> Simpan</>}</Button>
            <Button onClick={addNoteWithAi} disabled={isSaving || isSavingWithAi} variant="ghost" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 w-full sm:w-44">{isSavingWithAi ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : <><Sparkles className="mr-2 h-4 w-4" /> Simpan Dengan AI</>}</Button>
          </div>
        </CardContent>
      </Card>

      {/* List Knowledge Card */}
      <Card>
        <CardHeader><CardTitle>Daftar Pengetahuan</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {notes.length === 0 && <p className="text-neutral-600 sm:col-span-3">Belum ada catatan.</p>}
          {notes.map((n) => (
            <div key={n.id} className="flex flex-col rounded-lg border bg-white shadow-sm">
               {/* --- NEW: SHOW IMAGE IN CARD --- */}
              {n.image_url && <img src={n.image_url} alt={n.title} className="aspect-video w-full rounded-t-lg object-cover" />}
              <div className="border-b p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                        {n.category_name && <Badge variant="secondary">{n.category_name}</Badge>}
                        {/* --- NEW: SHOW PUBLIC/PRIVATE BADGE --- */}
                        <Badge variant={n.public ? 'default' : 'destructive'} className={n.public ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{n.public ? "Publik" : "Private"}</Badge>
                    </div>
                    <h3 className="truncate font-semibold text-neutral-900" title={n.title || "Tanpa Judul"}>{n.title || "Tanpa Judul"}</h3>
                    <p className="text-xs text-neutral-600">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="icon" onClick={() => setEditingNote(n)} aria-label="Edit"><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => deleteNote(n.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              {/* ... rest of card (unchanged) ... */}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* --- MODIFIED Edit Modal Dialog --- */}
      {editingNote && (
        <Dialog open={!!editingNote} onOpenChange={(isOpen) => !isOpen && setEditingNote(null)}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader><DialogTitle>Edit Catatan</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1"><Label htmlFor="edit-title">Judul</Label><Input id="edit-title" value={editingNote.title} onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })} /></div>
              <div className="space-y-1">
                <Label htmlFor="edit-category">Kategori</Label>
                {/* ... category select (unchanged) ... */}
              </div>
              <div className="space-y-1"><Label htmlFor="edit-content">Isi Konten</Label><Textarea id="edit-content" value={editingNote.content || ""} onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })} rows={8} /></div>
              
              {/* --- NEW: EDIT IMAGE --- */}
              <div className="space-y-2 rounded-lg border p-4">
                <Label>Gambar Utama</Label>
                {editingNote.image_url && (
                    <div className="relative w-full max-w-sm">
                        <img src={editingNote.image_url} alt="Preview" className="h-auto w-full rounded-md border" />
                        <Button variant="destructive" size="icon" onClick={() => removeImage('edit')} className="absolute right-2 top-2 h-7 w-7 opacity-80 hover:opacity-100">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                <Button asChild variant="outline" disabled={isUploading}>
                    <Label className="cursor-pointer">
                        {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...</> : <><ImageIcon className="mr-2 h-4 w-4" /> {editingNote.image_url ? 'Ganti Gambar' : 'Unggah Gambar'}</>}
                        <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'edit')} accept="image/png, image/jpeg, image/webp" disabled={isUploading} />
                    </Label>
                </Button>
              </div>

              {/* --- NEW: EDIT PUBLIC STATUS --- */}
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                  <Switch id="edit-public-toggle" checked={!!editingNote.public} onCheckedChange={(checked) => setEditingNote({ ...editingNote, public: checked })} />
                  <Label htmlFor="edit-public-toggle">Tampilkan ke Publik</Label>
              </div>

              <p className="text-sm text-neutral-600">Catatan: Tautan dan file yang terkait tidak dapat diubah dari sini.</p>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
              <Button type="submit" onClick={handleUpdateNote} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Perubahan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
