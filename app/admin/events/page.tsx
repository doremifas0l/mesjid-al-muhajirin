"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"

type EventRowType = {
  id: string
  title: string
  starts_at: string // ISO
  location: string
  description?: string
  image_url?: string
  image_path?: string
}

type Recurrence = "one-time" | "daily" | "weekly" | "monthly"

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
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/events")
      if (res.ok) {
        const j = await res.json()
        const list = (j?.data || []) as EventRowType[]
        setEvents(list)
      }
    })()
  }, [])

  async function handleImageUpload(file: File) {
    try {
      setUploading(true)
      const { path, publicUrl } = await uploadImage(file)
      setForm((f) => ({ ...f, image_url: publicUrl, image_path: path }))
    } catch (e: any) {
      alert(`Gagal mengunggah gambar: ${e?.message || "Unknown error"}`)
    } finally {
      setUploading(false)
    }
  }

  function buildISO(date: string, time: string) {
    // robustly build ISO string (local date+time -> ISO)
    const safeDate = date || new Date().toISOString().slice(0, 10)
    const safeTime = time || "00:00"
    const d = new Date(`${safeDate}T${safeTime}:00`)
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  }

  async function addEvent() {
    const count = Math.max(1, form.count || 1)
    const startISO = buildISO(form.date, form.time)

    const toInsert: Omit<EventRowType, "id">[] = []
    for (let i = 0; i < count; i++) {
      const base = new Date(startISO)
      const d = new Date(base)
      if (form.recurrence === "daily" && i > 0) d.setDate(base.getDate() + i)
      if (form.recurrence === "weekly" && i > 0) d.setDate(base.getDate() + 7 * i)
      if (form.recurrence === "monthly" && i > 0) d.setMonth(base.getMonth() + i)

      toInsert.push({
        title: form.title.trim() || "Kegiatan Masjid",
        starts_at: d.toISOString(),
        location: form.location.trim() || "Mesjid Al Muhajirin",
        description: form.description.trim() || "",
        image_url: form.image_url || undefined,
        image_path: form.image_path || undefined,
      } as any)
    }

    for (const ev of toInsert) {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(`Gagal menambah kegiatan: ${j?.error || res.statusText}`)
        continue
      }
      const { data } = await res.json()
      setEvents((prev) => [data as EventRowType, ...prev])
    }

    setForm((f) => ({
      ...f,
      title: "",
      location: "Mesjid Al Muhajirin",
      description: "",
      image_url: "",
      image_path: "",
    }))
  }

  async function deleteEvent(id: string, image_path?: string) {
    const res = await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id))
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
              <EventLine key={ev.id} ev={ev} onDelete={() => deleteEvent(ev.id, ev.image_path)} />
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
              <EventLine key={ev.id} ev={ev} onDelete={() => deleteEvent(ev.id, ev.image_path)} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EventLine({ ev, onDelete }: { ev: EventRowType; onDelete: () => void }) {
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
      </div>
      <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Hapus kegiatan">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
