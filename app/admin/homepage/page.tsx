"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Trash2, ArrowUp, ArrowDown, Save, Plus } from "lucide-react"

type HeroImage = { id?: string; url: string; path: string; position: number }

type HomeContent = {
  site_title: string
  hero_tag: string
  announcement: string
  about_title: string
  about_body: string
  about_bullets: string[]
  events_title: string
  events_subtitle: string
  youtube_title: string
  youtube_subtitle: string
  featured_video_url: string
}

const DEFAULT_VIDEO = "https://www.youtube.com/watch?v=oJyWJ8d4TUs"

async function uploadToStorage(file: File) {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder", "homepage")
  const res = await fetch("/api/storage/upload", { method: "POST", body: fd })
  if (!res.ok) throw new Error((await res.json()).error || "Upload failed")
  return (await res.json()) as { path: string; publicUrl: string }
}

export default function AdminHomepagePage() {
  const [images, setImages] = useState<HeroImage[]>([])
  const [content, setContent] = useState<HomeContent>({
    site_title: "Mesjid Al-Muhajirin Sarimas",
    hero_tag: "AI-Powered Community Hub",
    announcement: "Selamat datang di Mesjid Al-Muhajirin Sarimas. Mari makmurkan masjid bersama!",
    about_title: "Tentang Masjid",
    about_body:
      "Mesjid Al-Muhajirin Sarimas adalah pusat kegiatan ibadah dan sosial masyarakat Sarimas. Dengan bantuan AI, kami berupaya menghadirkan informasi kegiatan, pelayanan, dan interaksi yang lebih cepat dan mudah.",
    about_bullets: [
      "Informasi jadwal shalat dan kajian",
      "Pendaftaran kelas dan kegiatan sosial",
      "Chatbot untuk tanya jawab cepat",
    ],
    events_title: "Kegiatan Mendatang",
    events_subtitle: "Jangan lewatkan agenda komunitas kita.",
    youtube_title: "YouTube",
    youtube_subtitle: "Tonton ceramah dan kegiatan terbaru.",
    featured_video_url: DEFAULT_VIDEO,
  })
  const [newBullet, setNewBullet] = useState("")

  useEffect(() => {
    ;(async () => {
      // Load content
      const cRes = await fetch("/api/homepage/content")
      if (cRes.ok) {
        const j = await cRes.json()
        if (j?.data) {
          const d = j.data
          setContent((prev) => ({
            ...prev,
            site_title: d.site_title ?? prev.site_title,
            hero_tag: d.hero_tag ?? prev.hero_tag,
            announcement: d.announcement ?? prev.announcement,
            about_title: d.about_title ?? prev.about_title,
            about_body: d.about_body ?? prev.about_body,
            about_bullets: Array.isArray(d.about_bullets) ? d.about_bullets : prev.about_bullets,
            events_title: d.events_title ?? prev.events_title,
            events_subtitle: d.events_subtitle ?? prev.events_subtitle,
            youtube_title: d.youtube_title ?? prev.youtube_title,
            youtube_subtitle: d.youtube_subtitle ?? prev.youtube_subtitle,
            featured_video_url: d.featured_video_url ?? DEFAULT_VIDEO,
          }))
        }
      }
      // Load images
      const iRes = await fetch("/api/homepage/images")
      if (iRes.ok) {
        const j = await iRes.json()
        const list = (j?.data as any[]) || []
        setImages(list.map((r) => ({ id: r.id, url: r.url, path: r.path, position: r.position ?? 0 })).slice(0, 5))
      }
    })()
  }, [])

  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const remaining = Math.max(0, 5 - images.length)
    const pick = Array.from(files).slice(0, remaining)
    if (pick.length === 0) return
    const uploaded: HeroImage[] = []
    for (const file of pick) {
      try {
        const { path, publicUrl } = await uploadToStorage(file)
        // Save DB row
        const res = await fetch("/api/homepage/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, url: publicUrl, position: images.length + uploaded.length }),
        })
        if (!res.ok) throw new Error((await res.json()).error || "Insert failed")
        const { data } = await res.json()
        uploaded.push({ id: data.id, url: data.url, path: data.path, position: data.position ?? 0 })
      } catch (e) {
        console.error(e)
        alert("Gagal mengunggah sebagian file.")
      }
    }
    setImages((prev) => [...prev, ...uploaded].slice(0, 5))
  }

  async function removeAt(i: number) {
    const target = images[i]
    if (!target) return
    // Delete DB row
    await fetch("/api/homepage/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id }),
    })
    // Delete storage object (best-effort)
    await fetch("/api/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: target.path }),
    }).catch(() => {})
    setImages((arr) => arr.filter((_, idx) => idx !== i))
  }

  async function moveUp(i: number) {
    if (i <= 0) return
    const next = images.slice()
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    setImages(next)
    await persistPositions(next)
  }

  async function moveDown(i: number) {
    if (i >= images.length - 1) return
    const next = images.slice()
    ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
    setImages(next)
    await persistPositions(next)
  }

  async function persistPositions(list: HeroImage[]) {
    await Promise.all(
      list.map((img, idx) =>
        fetch("/api/homepage/images", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: img.id, position: idx }),
        }),
      ),
    )
  }

  async function saveVideo() {
    await fetch("/api/homepage/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured_video_url: content.featured_video_url || DEFAULT_VIDEO }),
    })
    alert("URL video tersimpan.")
  }

  async function saveContent() {
    const payload = {
      site_title: content.site_title,
      hero_tag: content.hero_tag,
      announcement: content.announcement,
      about_title: content.about_title,
      about_body: content.about_body,
      about_bullets: content.about_bullets,
      events_title: content.events_title,
      events_subtitle: content.events_subtitle,
      youtube_title: content.youtube_title,
      youtube_subtitle: content.youtube_subtitle,
    }
    await fetch("/api/homepage/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    alert("Konten beranda tersimpan.")
  }

  function addBullet() {
    const val = newBullet.trim()
    if (!val) return
    setContent((c) => ({ ...c, about_bullets: [...c.about_bullets, val] }))
    setNewBullet("")
  }

  function removeBullet(i: number) {
    setContent((c) => ({ ...c, about_bullets: c.about_bullets.filter((_, idx) => idx !== i) }))
  }

  function moveBulletUp(i: number) {
    if (i <= 0) return
    setContent((c) => {
      const arr = c.about_bullets.slice()
      ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
      return { ...c, about_bullets: arr }
    })
  }

  function moveBulletDown(i: number) {
    setContent((c) => {
      if (i >= c.about_bullets.length - 1) return c
      const arr = c.about_bullets.slice()
      ;[arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]
      return { ...c, about_bullets: arr }
    })
  }

  const bulletLimitReached = useMemo(() => content.about_bullets.length >= 10, [content.about_bullets.length])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Homepage</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-neutral-900">Gambar Slideshow (maks. 5)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-neutral-100">
                <ImagePlus className="mr-2 h-4 w-4" /> Tambah Gambar
              </span>
            </label>
            <span className="text-sm text-neutral-600">Jumlah saat ini: {images.length}/5</span>
          </div>

          {images.length === 0 ? (
            <p className="text-neutral-600">Belum ada gambar. Tambahkan hingga 5 gambar untuk slideshow beranda.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {images.map((img, i) => (
                <div key={img.id ?? i} className="overflow-hidden rounded-lg border">
                  <img
                    src={img.url || "/placeholder.svg"}
                    alt={`Gambar ${i + 1}`}
                    className="h-40 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 border-t p-2">
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" onClick={() => moveUp(i)} aria-label="Naikkan">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => moveDown(i)} aria-label="Turunkan">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => removeAt(i)} aria-label="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-neutral-900">YouTube Featured Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="yturl">URL Video YouTube</Label>
          <Input
            id="yturl"
            placeholder="https://www.youtube.com/watch?v=..."
            value={content.featured_video_url}
            onChange={(e) => setContent((c) => ({ ...c, featured_video_url: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Button onClick={saveVideo} className="bg-neutral-900 hover:bg-black">
              <Save className="mr-2 h-4 w-4" />
              Simpan URL Video
            </Button>
            <Button
              variant="outline"
              onClick={() => setContent((c) => ({ ...c, featured_video_url: DEFAULT_VIDEO }))}
              title="Setel ke default"
            >
              Gunakan Default
            </Button>
          </div>
          <p className="text-xs text-neutral-600">Default saat ini: {DEFAULT_VIDEO}</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-neutral-900">Konten Teks Beranda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="siteTitle">Judul Situs</Label>
              <Input
                id="siteTitle"
                value={content.site_title}
                onChange={(e) => setContent((c) => ({ ...c, site_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="heroTag">Tagline (badge kecil)</Label>
              <Input
                id="heroTag"
                value={content.hero_tag}
                onChange={(e) => setContent((c) => ({ ...c, hero_tag: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="announcement">Pengumuman</Label>
              <Textarea
                id="announcement"
                value={content.announcement}
                onChange={(e) => setContent((c) => ({ ...c, announcement: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="aboutTitle">Judul "Tentang"</Label>
              <Input
                id="aboutTitle"
                value={content.about_title}
                onChange={(e) => setContent((c) => ({ ...c, about_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="aboutBody">Isi "Tentang"</Label>
              <Textarea
                id="aboutBody"
                value={content.about_body}
                onChange={(e) => setContent((c) => ({ ...c, about_body: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Poin "Tentang" (maks. 10)</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tambah poin baru"
                  value={newBullet}
                  onChange={(e) => setNewBullet(e.target.value)}
                  disabled={bulletLimitReached}
                />
                <Button type="button" onClick={addBullet} disabled={bulletLimitReached}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah
                </Button>
              </div>
              {content.about_bullets.length === 0 ? (
                <p className="text-sm text-neutral-600">Belum ada poin.</p>
              ) : (
                <div className="grid gap-2">
                  {content.about_bullets.map((b, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border p-2">
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-sm text-neutral-800">{b}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={() => moveBulletUp(i)} aria-label="Naik">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => moveBulletDown(i)} aria-label="Turun">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => removeBullet(i)} aria-label="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="eventsTitle">Judul Kegiatan</Label>
              <Input
                id="eventsTitle"
                value={content.events_title}
                onChange={(e) => setContent((c) => ({ ...c, events_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eventsSubtitle">Subjudul Kegiatan</Label>
              <Input
                id="eventsSubtitle"
                value={content.events_subtitle}
                onChange={(e) => setContent((c) => ({ ...c, events_subtitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="youtubeTitle">Judul YouTube</Label>
              <Input
                id="youtubeTitle"
                value={content.youtube_title}
                onChange={(e) => setContent((c) => ({ ...c, youtube_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="youtubeSubtitle">Subjudul YouTube</Label>
              <Input
                id="youtubeSubtitle"
                value={content.youtube_subtitle}
                onChange={(e) => setContent((c) => ({ ...c, youtube_subtitle: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Button onClick={saveContent} className="bg-neutral-900 hover:bg-black">
              <Save className="mr-2 h-4 w-4" />
              Simpan Konten
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
