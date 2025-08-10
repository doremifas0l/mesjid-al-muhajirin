"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send } from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content?: string
  parts?: Array<{ type: string; text?: string }>
}

export default function ChatBot() {
  // useChat from @ai-sdk/react works with a UI message stream from the API [^3][^4]
  const { messages, sendMessage, isLoading, error } = useChat({
    api: "/api/chat",
  })

  const [input, setInput] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    sendMessage({ text })
    setInput("")
  }

  const renderedMessages = useMemo<ChatMessage[]>(
    () =>
      messages.map((m: any) => ({
        id: m.id,
        role: m.role as ChatMessage["role"],
        content: typeof m.content === "string" ? m.content : undefined,
        parts: Array.isArray(m.parts) ? m.parts : undefined,
      })),
    [messages],
  )

  const isSendDisabled = isLoading || input.trim().length === 0

  const getMessageText = (m: ChatMessage) => {
    if (m.parts && m.parts.length > 0) {
      return m.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join("")
    }
    return m.content ?? ""
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-neutral-700" />
          <CardTitle className="text-neutral-900">Chatbot Masjid</CardTitle>
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
              {getMessageText(m)}
            </div>
          </div>
        ))}
        {error && (
          <p className="text-xs text-red-600">
            Tidak dapat terhubung ke AI. Pastikan GOOGLE_GENERATIVE_AI_API_KEY terset dan /api/chat aktif.
          </p>
        )}
      </CardContent>

      <CardFooter>
        <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaan Anda..."
            aria-label="Ketik pesan untuk chatbot"
            autoComplete="off"
            enterKeyHint="send"
          />
          <Button type="submit" className="bg-neutral-900 hover:bg-black" disabled={isSendDisabled}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Kirim</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
