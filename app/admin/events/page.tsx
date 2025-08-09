"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Plus, Pencil } from 'lucide-react'

type Recurrence = "one-time" | "daily" | "weekly" | "monthly"

type EventRowType = {
  id: string
  title: string
  starts_at: string
  location: string
  description?: string
  image_url?: string | null
  image_path?: string | null
  recurrence?: Recurrence
}

async function uploadImage(file: File) {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder", "events")
  const res = await fetch("/api/storage/upload", { method: "POST", body: fd })
  if (!res.ok) {
    let msg = "Upload failed"
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  return (await res.json()) as { path: string; publicUrl: string }
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventRowType[]>([])
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState<{
    title: string
    date: string
    time: string
    location: string
    description: string
    image_url: string
    image_path: string
    recurrence: Recurrence
    count: number
  }>({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "07:00",
    location: "Mesjid Al Muhajirin",
    description: "",
    image_url: "",
    image_path: "",
    recurrence: "one-time",
    count: 1,
  })

  const [editOpen, setEditOpen] = useState(false)
  const [edit, setEdit] = useState<{
    id: string
    title: string
    date: string
    time: string
    location: string
    description: string
    image_url: string
    image_path: string
    recurrence: Recurrence
  } | null>(null)

  useEffect(() => {
    ;(async () => {
      // Rollover first, then load
      await fetch("/api/events/rollover", { method: "POST" }).catch(() => {})
      await refresh()
    })()
  }, [])

  async function refresh() {
    const res = await fetch("/api/events", { cache: "no-store" })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(`Gagal memuat kegiatan: ${j?.error || res.statusText}`)
      return
    }
    const j = await res.json()
    setEvents((j?.data || []) as EventRowType[])
  }

  function buildISO(date: string, time: string) {
    const safeDate = date || new Date().toISOString().slice(0, 10)
    const safeTime = time || "00:00"
    const full = `${safeDate}T${safeTime.length === 5 ? safeTime + ":00" : safeTime}`
    const d = new Date(full)
    return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString()
  }

  async function handleImageUpload(file: File, forEdit = false) {
    try {
      setUploading(true)
      const { path, publicUrl } = await uploadImage(file)
      if (forEdit && edit) {
        setEdit({ ...edit, image_url: publicUrl, image_path: path })
      } else {
        setForm((f) => ({ ...f, image_url: publicUrl, image_path: path }))
      }
    } catch (e: any) {
      alert(`Gagal mengunggah gambar: ${e?.message || "Unknown error"}`)
    } finally {
      setUploading(false)
    }
  }

  async function addEvent() {
    const count = Math.max(1, form.count || 1)
    const baseISO = buildISO(form.date, form.time)
    const base = new Date(baseISO)

    const toInsert: any[] = []
    for (let i = 0; i < count; i++) {
      const d = new Date(base)
      if (form.recurrence === "daily" && i > 0) d.setDate(base.getDate() + i)
      if (form.recurrence === "weekly" && i > 0) d.setDate(base.getDate() + 7 * i)
      if (form.recurrence === "monthly" && i > 0) d.setMonth(base.getMonth() + i)
      toInsert.push({
        title: form.title.trim() || "Kegiatan Masjid",
        starts_at: d.toISOString(),
        location: form.location.trim() || "Mesjid Al Muhajirin",
        description: form.description.trim() || "",
        image_url: form.image_url || null,
        image_path: form.image_path || null,
        recurrence: form.recurrence,
      })
    }

    for (const ev of toInsert) {
      // Try with recurrence; if server complains, it will retry without it.
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(`Gagal menambah kegiatan: ${j?.error || res.statusText}`)
      }
    }

    await refresh()
    setForm((f) => ({
      ...f,
      title: "",
      location: "Mesjid Al Muhajirin",
      description: "",
      image_url: "",
      image_path: "",
    }))
  }

  async function deleteEvent(id: string, image_path?: string | null) {
    const res = await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      await refresh()
      if (image_path) {
        fetch("/api/storage/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: image_path }),
        }).catch(() => {})
      }
    } else {
      const j = await res.json().catch(() => ({}))
      alert(`Gagal menghapus: ${j?.error || res.statusText}`)
    }
  }

  function openEdit(ev: EventRowType) {
    const d = new Date(ev.starts_at)
    const date = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    const time = Number.isFinite(d.getTime()) ? d.toISOString().slice(11, 16) : "07:00"
    setEdit({
      id: ev.id,
      title: ev.title,
      date,
      time,
      location: ev.location,
      description: ev.description || "",
      image_url: ev.image_url || "",
      image_path: ev.image_path || "",
      recurrence: (ev.recurrence as Recurrence) || "one-time",
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!edit) return
    const payload: any = {
      id: edit.id,
      title: edit.title.trim() || "Kegiatan Masjid",
      starts_at: buildISO(edit.date, edit.time),
      location: edit.location.trim() || "Mesjid Al Muhajirin",
      description: edit.description.trim() || "",
      image_url: edit.image_url || null,
      image_path: edit.image_path || null,
      recurrence: edit.recurrence,
    }
    const res = await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(`Gagal menyimpan: ${j?.error || res.statusText}`)
      return
    }
    setEditOpen(false)
    setEdit(null)
    await refresh()
  }

  const now = Date.now()
  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => {
          const t = new Date(e.starts_at).getTime()
          return Number.isFinite(t) && t >= now
        })
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [events, now],
  )
  const past = useMemo(
    () =>
      [...events]
        .filter((e) => {
          const t = new Date(e.starts_at).getTime()
          return Number.isFinite(t) && t < now
        })
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    [events, now],
  )

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-neutral-900">Tambah Kegiatan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
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
            <div className="space-y-1">
              <Label htmlFor="time">Waktu</Label>
              <Input
                id="time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="image">Gambar Kegiatan</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleImageUpload(f)
                    }}
                  />
                  {uploading && <span className="text-xs text-neutral-500">Mengunggah...</span>}
                </div>
                <Input
                  placeholder="atau tempel URL (opsional)"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value, image_path: "" })}
                />
              </div>
              {form.image_url && (
                <div className="mt-2 overflow-hidden rounded-md border">
                  <img
                    src={form.image_url || "/placeholder.svg"}
                    alt="Pratinjau gambar kegiatan"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="desc">Deskripsi</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Pengulangan</Label>
              <Select value={form.recurrence} onValueChange={(v: Recurrence) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pengulangan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">Sekali</SelectItem>
                  <SelectItem value="daily">Harian</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="count">Jumlah Kemunculan</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={52}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value || 1) })}
              />
              <p className="text-xs text-neutral-500 mt-1">Bila {"("}count{")"} &gt; 1, akan dibuat beberapa jadwal ke depan.</p>
            </div>
            <div className="flex items-end">
              <Button onClick={addEvent} className="w-full bg-neutral-900 hover:bg-black">
                <Plus className="mr-2 h-4 w-4" />
                Tambah
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-900">Kegiatan Mendatang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-neutral-600">Tidak ada kegiatan mendatang.</p>}
            {upcoming.map((ev) => (
              <EventLine
                key={ev.id}
                ev={ev}
                onDelete={() => deleteEvent(ev.id, ev.image_path)}
                onEdit={() => openEdit(ev)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-900">Kegiatan Lampau</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {past.length === 0 && <p className="text-neutral-600">Belum ada kegiatan lampau.</p>}
            {past.map((ev) => (
              <EventLine
                key={ev.id}
                ev={ev}
                onDelete={() => deleteEvent(ev.id, ev.image_path)}
                onEdit={() => openEdit(ev)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Kegiatan</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Judul</Label>
                <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tanggal</Label>
                  <Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Waktu</Label>
                  <Input type="time" value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Lokasi</Label>
                <Input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Deskripsi</Label>
                <Textarea
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Gambar</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleImageUpload(f, true)
                    }}
                  />
                  {uploading && <span className="text-xs text-neutral-500">Mengunggah...</span>}
                </div>
                <Input
                  placeholder="atau tempel URL (opsional)"
                  value={edit.image_url}
                  onChange={(e) => setEdit({ ...edit, image_url: e.target.value, image_path: "" })}
                />
                {edit.image_url && (
                  <div className="mt-2 overflow-hidden rounded-md border">
                    <img
                      src={edit.image_url || "/placeholder.svg"}
                      alt="Pratinjau gambar kegiatan"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Pengulangan</Label>
                <Select
                  value={edit.recurrence}
                  onValueChange={(v: Recurrence) => setEdit({ ...edit, recurrence: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pengulangan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">Sekali</SelectItem>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveEdit} className="bg-neutral-900 hover:bg-black">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventLine({
  ev,
  onDelete,
  onEdit,
}: {
  ev: EventRowType
  onDelete: () => void
  onEdit: () => void
}) {
  const t = new Date(ev.starts_at)
  const isValid = Number.isFinite(t.getTime())
  const dateStr = isValid
    ? t.toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Tanggal tidak valid"

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="font-medium text-neutral-900">{ev.title}</div>
        <div className="mt-1 text-sm text-neutral-700">{dateStr}</div>
        <div className="text-sm text-neutral-700">{ev.location}</div>
        {ev.description && <p className="mt-2 text-sm text-neutral-600">{ev.description}</p>}
        {ev.image_url && (
          <div className="mt-2 overflow-hidden rounded-md border">
            <img src={ev.image_url || "/placeholder.svg"} alt="Gambar kegiatan" className="h-28 w-full object-cover" />
          </div>
        )}
        {ev.recurrence && ev.recurrence !== "one-time" && (
          <p className="mt-1 text-xs text-neutral-500">{`Berulang: ${ev.recurrence}`}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onEdit} aria-label="Edit kegiatan">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Hapus kegiatan">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
