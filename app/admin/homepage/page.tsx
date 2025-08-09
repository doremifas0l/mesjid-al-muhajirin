"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Trash2, ArrowUp, ArrowDown, Save, Plus } from "lucide-react"

const HERO_KEY = "masjid_hero_images"
const FEATURED_VIDEO_KEY = "masjid_featured_video"
const CONTENT_KEY = "masjid_home_content"
const DEFAULT_VIDEO = "https://www.youtube.com/watch?v=oJyWJ8d4TUs"

type HomeContent = {
  siteTitle: string
  heroTag: string
  announcement: string
  aboutTitle: string
  aboutBody: string
  aboutBullets: string[]
  eventsTitle: string
  eventsSubtitle: string
  youtubeTitle: string
  youtubeSubtitle: string
}

const defaultContent: HomeContent = {
  siteTitle: "Mesjid Al-Muhajirin Sarimas",
  heroTag: "AI-Powered Community Hub",
  announcement: "Selamat datang di Mesjid Al-Muhajirin Sarimas. Mari makmurkan masjid bersama!",
  aboutTitle: "Tentang Masjid",
  aboutBody:
    "Mesjid Al-Muhajirin Sarimas adalah pusat kegiatan ibadah dan sosial masyarakat Sarimas. Dengan bantuan AI, kami berupaya menghadirkan informasi kegiatan, pelayanan, dan interaksi yang lebih cepat dan mudah.",
  aboutBullets: [
    "Informasi jadwal shalat dan kajian",
    "Pendaftaran kelas dan kegiatan sosial",
    "Chatbot untuk tanya jawab cepat",
  ],
  eventsTitle: "Kegiatan Mendatang",
  eventsSubtitle: "Jangan lewatkan agenda komunitas kita.",
  youtubeTitle: "YouTube",
  youtubeSubtitle: "Tonton ceramah dan kegiatan terbaru.",
}

export default function AdminHomepagePage() {
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [content, setContent] = useState<HomeContent>(defaultContent)
  const [newBullet, setNewBullet] = useState("")

  // Load initial state
  useEffect(() => {
    if (typeof window === "undefined") return
    // Images
    const imgs = localStorage.getItem(HERO_KEY)
    if (imgs) {
      try {
        const parsed = JSON.parse(imgs) as string[]
        setImages(Array.isArray(parsed) ? parsed.slice(0, 5) : [])
      } catch {
        setImages([])
      }
    }
    // Video
    const vid = localStorage.getItem(FEATURED_VIDEO_KEY)
    if (vid && vid.trim().length > 0) {
      setVideoUrl(vid)
    } else {
      setVideoUrl(DEFAULT_VIDEO)
    }
    // Content (with migration from old announcement if present)
    const rawContent = localStorage.getItem(CONTENT_KEY)
    if (rawContent) {
      try {
        const parsed = JSON.parse(rawContent) as Partial<HomeContent>
        setContent({ ...defaultContent, ...parsed })
      } catch {
        setContent(defaultContent)
      }
    } else {
      const legacyAnn = localStorage.getItem("masjid_announcement")
      setContent({
        ...defaultContent,
        announcement: legacyAnn && legacyAnn.trim().length > 0 ? legacyAnn : defaultContent.announcement,
      })
    }
  }, [])

  // Persist images immediately
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(HERO_KEY, JSON.stringify(images.slice(0, 5)))
    }
  }, [images])

  function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const current = images.slice()
    const remaining = Math.max(0, 5 - current.length)
    const pick = Array.from(files).slice(0, remaining)
    if (pick.length === 0) return
    let count = 0
    pick.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        current.push(dataUrl)
        count++
        if (count === pick.length) {
          setImages(current.slice(0, 5))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  function removeAt(i: number) {
    setImages((arr) => arr.filter((_, idx) => idx !== i))
  }

  function moveUp(i: number) {
    if (i <= 0) return
    setImages((arr) => {
      const next = arr.slice()
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  function moveDown(i: number) {
    setImages((arr) => {
      if (i >= arr.length - 1) return arr
      const next = arr.slice()
      ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
      return next
    })
  }

  function saveVideo() {
    if (typeof window === "undefined") return
    localStorage.setItem(FEATURED_VIDEO_KEY, (videoUrl || "").trim())
    alert("URL video tersimpan.")
  }

  function saveContent() {
    if (typeof window === "undefined") return
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content))
    // Keep legacy announcement in sync for older code paths
    localStorage.setItem("masjid_announcement", content.announcement || "")
    alert("Konten beranda tersimpan.")
  }

  function addBullet() {
    const val = newBullet.trim()
    if (!val) return
    setContent((c) => ({ ...c, aboutBullets: [...c.aboutBullets, val] }))
    setNewBullet("")
  }

  function removeBullet(i: number) {
    setContent((c) => ({ ...c, aboutBullets: c.aboutBullets.filter((_, idx) => idx !== i) }))
  }

  function moveBulletUp(i: number) {
    if (i <= 0) return
    setContent((c) => {
      const arr = c.aboutBullets.slice()
      ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
      return { ...c, aboutBullets: arr }
    })
  }

  function moveBulletDown(i: number) {
    setContent((c) => {
      if (i >= c.aboutBullets.length - 1) return c
      const arr = c.aboutBullets.slice()
      ;[arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]
      return { ...c, aboutBullets: arr }
    })
  }

  const bulletLimitReached = useMemo(() => content.aboutBullets.length >= 10, [content.aboutBullets.length])

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
              {images.map((src, i) => (
                <div key={i} className="overflow-hidden rounded-lg border">
                  <img src={src || "/placeholder.svg"} alt={`Gambar ${i + 1}`} className="h-40 w-full object-cover" />
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
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button onClick={saveVideo} className="bg-neutral-900 hover:bg-black">
              <Save className="mr-2 h-4 w-4" />
              Simpan URL Video
            </Button>
            <Button variant="outline" onClick={() => setVideoUrl(DEFAULT_VIDEO)} title="Setel ke default">
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
                value={content.siteTitle}
                onChange={(e) => setContent((c) => ({ ...c, siteTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="heroTag">Tagline (badge kecil)</Label>
              <Input
                id="heroTag"
                value={content.heroTag}
                onChange={(e) => setContent((c) => ({ ...c, heroTag: e.target.value }))}
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
                value={content.aboutTitle}
                onChange={(e) => setContent((c) => ({ ...c, aboutTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="aboutBody">Isi "Tentang"</Label>
              <Textarea
                id="aboutBody"
                value={content.aboutBody}
                onChange={(e) => setContent((c) => ({ ...c, aboutBody: e.target.value }))}
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
              {content.aboutBullets.length === 0 ? (
                <p className="text-sm text-neutral-600">Belum ada poin.</p>
              ) : (
                <div className="grid gap-2">
                  {content.aboutBullets.map((b, i) => (
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
                value={content.eventsTitle}
                onChange={(e) => setContent((c) => ({ ...c, eventsTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eventsSubtitle">Subjudul Kegiatan</Label>
              <Input
                id="eventsSubtitle"
                value={content.eventsSubtitle}
                onChange={(e) => setContent((c) => ({ ...c, eventsSubtitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="youtubeTitle">Judul YouTube</Label>
              <Input
                id="youtubeTitle"
                value={content.youtubeTitle}
                onChange={(e) => setContent((c) => ({ ...c, youtubeTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="youtubeSubtitle">Subjudul YouTube</Label>
              <Input
                id="youtubeSubtitle"
                value={content.youtubeSubtitle}
                onChange={(e) => setContent((c) => ({ ...c, youtubeSubtitle: e.target.value }))}
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
