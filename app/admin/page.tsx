"use client"

import type React from "react"
import { redirect } from "next/navigation"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, FileDown, FileUp, ImagePlus } from "lucide-react"
import type { EventItem } from "@/components/event-card"

// Redirect /admin to the default "Event" view
export default function AdminIndex() {
  redirect("/admin/events")
}

export function AdminPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [announcement, setAnnouncement] = useState("")
  const [heroImageUrl, setHeroImageUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const authed = localStorage.getItem("masjid_admin_authed") === "true"
    if (!authed) {
      router.replace("/login")
      return
    }
    const stored = localStorage.getItem("masjid_events")
    if (stored) {
      try {
        setEvents(JSON.parse(stored) as EventItem[])
      } catch {
        setEvents([])
      }
    }
    const ann = localStorage.getItem("masjid_announcement")
    if (ann) setAnnouncement(ann)
    const hero = localStorage.getItem("masjid_hero_image")
    if (hero) setHeroImageUrl(hero)
  }, [router])

  function addEvent() {
    const newEvent: EventItem = {
      id: crypto.randomUUID(),
      title: "",
      date: new Date().toISOString(),
      time: "07:00",
      location: "",
      description: "",
      imageUrl: "/mosque-event.png",
    }
    setEvents((prev) => [newEvent, ...prev])
  }

  function updateEvent(id: string, patch: Partial<EventItem>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  function saveAll() {
    localStorage.setItem("masjid_events", JSON.stringify(events))
    localStorage.setItem("masjid_announcement", announcement)
    localStorage.setItem("masjid_hero_image", heroImageUrl || "")
    alert("Perubahan disimpan.")
  }

  function exportData() {
    const data = {
      events,
      announcement,
      heroImageUrl,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "mesjid-data.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (Array.isArray(json.events)) setEvents(json.events)
        if (typeof json.announcement === "string") setAnnouncement(json.announcement)
        if (typeof json.heroImageUrl === "string") setHeroImageUrl(json.heroImageUrl)
      } catch {
        alert("File tidak valid.")
      }
    }
    reader.readAsText(file)
  }

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  )

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setHeroImageUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Dashboard Admin</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportData}>
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
            <label className="inline-flex items-center">
              <input type="file" accept="application/json" className="hidden" onChange={importData} />
              <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-neutral-100">
                <FileUp className="mr-2 h-4 w-4" /> Import
              </span>
            </label>
            <Button onClick={saveAll} className="bg-neutral-900 hover:bg-black">
              <Save className="mr-2 h-4 w-4" /> Simpan
            </Button>
          </div>
        </div>

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-neutral-900">Gambar Hero Beranda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                role="button"
                aria-label="Dropzone unggah gambar hero"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus className="h-6 w-6 text-neutral-700" />
                  <p className="text-sm text-neutral-700">Seret & lepaskan gambar, atau klik untuk memilih file</p>
                  <p className="text-xs text-neutral-500">
                    Format: JPG/PNG. Untuk penyimpanan sederhana, gambar akan disimpan sebagai Data URL.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f)
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-url">Atau tempel URL gambar</Label>
                <Input
                  id="hero-url"
                  placeholder="https://contoh.com/foto.jpg atau /images/foto.jpg"
                  value={heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pratinjau</Label>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border">
                  {/* Using a plain img to allow Data URLs preview */}
                  <img
                    src={
                      heroImageUrl && heroImageUrl.length > 0
                        ? heroImageUrl
                        : "/placeholder.svg?height=400&width=600&query=hero%20image%20placeholder%20preview"
                    }
                    alt="Pratinjau gambar hero"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-neutral-900">Pengumuman Beranda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="announcement">Teks Pengumuman</Label>
              <Textarea
                id="announcement"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Tulis pengumuman singkat untuk beranda..."
              />
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Kegiatan</h2>
            <Button onClick={addEvent} variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> Tambah Kegiatan
            </Button>
          </div>

          <div className="mt-4 grid gap-4">
            {sorted.length === 0 && <p className="text-neutral-600">Belum ada kegiatan. Tambahkan kegiatan baru.</p>}
            {sorted.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`title-${ev.id}`}>Judul</Label>
                      <Input
                        id={`title-${ev.id}`}
                        value={ev.title}
                        onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`date-${ev.id}`}>Tanggal</Label>
                        <Input
                          id={`date-${ev.id}`}
                          type="date"
                          value={new Date(ev.date).toISOString().slice(0, 10)}
                          onChange={(e) => {
                            const d = e.target.value
                              ? new Date(e.target.value + "T" + (ev.time || "00:00"))
                              : new Date()
                            updateEvent(ev.id, { date: d.toISOString() })
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`time-${ev.id}`}>Waktu</Label>
                        <Input
                          id={`time-${ev.id}`}
                          type="time"
                          value={ev.time}
                          onChange={(e) => updateEvent(ev.id, { time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`location-${ev.id}`}>Lokasi</Label>
                      <Input
                        id={`location-${ev.id}`}
                        value={ev.location}
                        onChange={(e) => updateEvent(ev.id, { location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`image-${ev.id}`}>Gambar (URL)</Label>
                      <Input
                        id={`image-${ev.id}`}
                        value={ev.imageUrl || ""}
                        onChange={(e) => updateEvent(ev.id, { imageUrl: e.target.value })}
                        placeholder="/images/foto.jpg atau https://..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`desc-${ev.id}`}>Deskripsi</Label>
                      <Textarea
                        id={`desc-${ev.id}`}
                        value={ev.description}
                        onChange={(e) => updateEvent(ev.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button variant="destructive" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
