"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"

type EventItem = {
  id: string
  title: string
  date: string // ISO date
  time: string // HH:mm
  location: string
  description: string
  imageUrl?: string // can be Data URL from upload
}

type Recurrence = "one-time" | "daily" | "weekly" | "monthly"

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [form, setForm] = useState<{
    title: string
    date: string
    time: string
    location: string
    description: string
    imageUrl: string
    recurrence: Recurrence
    count: number
  }>({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "07:00",
    location: "Mesjid Al Muhajirin",
    description: "",
    imageUrl: "",
    recurrence: "one-time",
    count: 1,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("masjid_events")
    if (stored) {
      try {
        setEvents(JSON.parse(stored) as EventItem[])
      } catch {
        setEvents([])
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("masjid_events", JSON.stringify(events))
    }
  }, [events])

  function handleImageUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setForm((f) => ({ ...f, imageUrl: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  function addEvent() {
    const count = Math.max(1, form.count || 1)
    const startDate = new Date(`${form.date}T${form.time || "00:00"}`)
    const generated: EventItem[] = []

    for (let i = 0; i < count; i++) {
      const d = new Date(startDate)
      if (form.recurrence === "daily" && i > 0) d.setDate(startDate.getDate() + i)
      if (form.recurrence === "weekly" && i > 0) d.setDate(startDate.getDate() + 7 * i)
      if (form.recurrence === "monthly" && i > 0) d.setMonth(startDate.getMonth() + i)

      generated.push({
        id: crypto.randomUUID(),
        title: form.title.trim() || "Kegiatan Masjid",
        date: d.toISOString(),
        time: form.time || "00:00",
        location: form.location.trim() || "Mesjid Al Muhajirin",
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
      })
    }

    setEvents((prev) => [...generated, ...prev])
    setForm((f) => ({
      ...f,
      title: "",
      location: "Mesjid Al Muhajirin",
      description: "",
      imageUrl: "",
    }))
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const now = Date.now()
  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => new Date(e.date).getTime() >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events, now],
  )
  const past = useMemo(
    () =>
      [...events]
        .filter((e) => new Date(e.date).getTime() < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
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
              <div className="flex items-center gap-3">
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload(f)
                  }}
                />
                <span className="text-xs text-neutral-500">Atau tempel URL:</span>
                <Input
                  placeholder="https://contoh.com/foto.jpg atau /images/foto.jpg"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
              {form.imageUrl && (
                <div className="mt-2 overflow-hidden rounded-md border">
                  {/* Show preview using plain img to support Data URLs */}
                  <img
                    src={form.imageUrl || "/placeholder.svg"}
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
              <EventRow key={ev.id} ev={ev} onDelete={() => deleteEvent(ev.id)} />
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
              <EventRow key={ev.id} ev={ev} onDelete={() => deleteEvent(ev.id)} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EventRow({ ev, onDelete }: { ev: EventItem; onDelete: () => void }) {
  const d = new Date(ev.date)
  const dateStr = d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="font-medium text-neutral-900">{ev.title}</div>
        <div className="mt-1 text-sm text-neutral-700">{dateStr}</div>
        <div className="text-sm text-neutral-700">{ev.location || "Mesjid Al Muhajirin"}</div>
        {ev.description && <p className="mt-2 text-sm text-neutral-600">{ev.description}</p>}
      </div>
      <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Hapus kegiatan">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
