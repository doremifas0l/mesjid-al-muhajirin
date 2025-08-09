"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MessageSquare, Send } from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

function buildContext() {
  if (typeof window === "undefined") return {}
  // Events (best-effort; adjust key if your admin stores under a different key)
  let events: any[] = []
  try {
    events = JSON.parse(localStorage.getItem("masjid_events") || "[]")
  } catch {
    events = []
  }
  // Finance totals by category + latest items
  let finance: any[] = []
  try {
    finance = JSON.parse(localStorage.getItem("masjid_finance") || "[]")
  } catch {
    finance = []
  }
  const byCategory: Record<string, { income: number; expense: number }> = {}
  finance.forEach((i: any) => {
    const cat = i.category || "Lainnya"
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 }
    if (i.type === "income") byCategory[cat].income += Number(i.amount || 0)
    else byCategory[cat].expense += Number(i.amount || 0)
  })
  const latestFinance = [...finance]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((i) => ({ type: i.type, category: i.category, amount: i.amount, date: i.date, note: i.note }))

  // Home content
  let content: any = {}
  try {
    content = JSON.parse(localStorage.getItem("masjid_home_content") || "{}")
  } catch {
    content = {}
  }

  return {
    content,
    events: events.slice(0, 10),
    financeSummary: byCategory,
    latestFinance,
  }
}

export default function ChatBot() {
  const [demoMode, setDemoMode] = useState<boolean>(true)
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([
    { id: "sys", role: "assistant", content: "Assalamu'alaikum! Ada yang bisa saya bantu tentang kegiatan masjid?" },
  ])

  const staticContext = useMemo(() => buildContext(), [])

  const { messages, handleSubmit, isLoading, error, setInput } = useChat({
    api: "/api/chat",
    body: { context: staticContext },
    onError: () => {
      setDemoMode(true)
    },
  })

  // Local input for stable onChange
  const [localInput, setLocalInput] = useState<string>("")

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, demoMessages])

  function handleDemoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = localInput.trim()
    if (!trimmed) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed }
    setDemoMessages((prev) => [...prev, userMsg])
    setLocalInput("")

    const replyText =
      "Terima kasih! Saya dapat membantu pertanyaan seputar informasi masjid yang tersedia dan info keagamaan faktual. Untuk hal di luar itu atau topik kontroversial, mohon maaf saya tidak bisa menjawab."
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: replyText }
    setTimeout(() => {
      setDemoMessages((prev) => [...prev, assistantMsg])
    }, 500)
  }

  function handleRealSubmit(e: React.FormEvent<HTMLFormElement>) {
    const trimmed = localInput.trim()
    if (!trimmed) {
      e.preventDefault()
      return
    }
    setInput(trimmed)
    handleSubmit(e)
    setLocalInput("")
  }

  const renderedMessages = useMemo(() => {
    return demoMode
      ? demoMessages
      : messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant" | "system", content: m.content }))
  }, [demoMode, demoMessages, messages])

  const isDemoSendDisabled = localInput.trim().length === 0
  const isRealSendDisabled = isLoading || localInput.trim().length === 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-neutral-700" />
          <CardTitle className="text-neutral-900">Chatbot Masjid</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="demo-mode" checked={demoMode} onCheckedChange={setDemoMode} />
          <Label htmlFor="demo-mode" className="text-sm">
            Demo mode
          </Label>
        </div>
      </CardHeader>
      <CardContent className="h-[360px] overflow-y-auto space-y-3 pr-2" ref={listRef} aria-live="polite">
        {renderedMessages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] rounded-lg px-3 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-50 text-neutral-900 border border-neutral-200")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {!demoMode && error && (
          <p className="text-xs text-red-600">
            Tidak dapat terhubung ke AI. Aktifkan Demo mode atau set GOOGLE_GENERATIVE_AI_API_KEY untuk respons Gemini
            nyata.
          </p>
        )}
      </CardContent>
      <CardFooter>
        {demoMode ? (
          <form onSubmit={handleDemoSubmit} className="flex w-full items-center gap-2">
            <Input
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="Tulis pertanyaan Anda..."
              aria-label="Ketik pesan untuk chatbot"
            />
            <Button type="submit" className="bg-neutral-900 hover:bg-black" disabled={isDemoSendDisabled}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Kirim</span>
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRealSubmit} className="flex w-full items-center gap-2">
            <Input
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="Tulis pertanyaan Anda..."
              aria-label="Ketik pesan untuk chatbot"
            />
            <Button type="submit" className="bg-neutral-900 hover:bg-black" disabled={isRealSendDisabled}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Kirim</span>
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  )
}
