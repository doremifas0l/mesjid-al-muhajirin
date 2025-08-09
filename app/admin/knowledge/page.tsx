"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus } from "lucide-react"

type NoteItem = {
  id: string
  title: string
  content: string
  created_at: string
}

export default function KnowledgeAdminPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [form, setForm] = useState<{ title: string; content: string }>({ title: "", content: "" })

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/notes")
      if (res.ok) {
        const j = await res.json()
        setNotes(j?.data || [])
      }
    })()
  }, [])

  async function addNote() {
    const title = form.title.trim()
    const content = form.content.trim()
    if (!content) return
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setNotes((prev) => [data, ...prev])
      setForm({ title: "", content: "" })
    }
  }

  async function deleteNote(id: string) {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-neutral-900">Tambah Catatan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contoh: Tentang Masjid, Ringkasan Ceramah"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="content">Isi</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Tulis catatan, ringkasan ceramah, atau info penting..."
            />
          </div>
          <div>
            <Button onClick={addNote} className="bg-neutral-900 hover:bg-black">
              <Plus className="mr-2 h-4 w-4" />
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-neutral-900">Catatan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {notes.length === 0 && <p className="text-neutral-600">Belum ada catatan.</p>}
          {notes.map((n) => (
            <div key={n.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-neutral-900">{n.title}</div>
                  <div className="text-xs text-neutral-600">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <Button variant="destructive" size="icon" onClick={() => deleteNote(n.id)} aria-label="Hapus catatan">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-800">{n.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
