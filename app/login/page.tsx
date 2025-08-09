"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

const DEFAULT_PASSWORD = "muhajirin120"

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("masjid_admin_authed") === "true") {
      router.replace("/admin")
    }
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (password === DEFAULT_PASSWORD) {
        localStorage.setItem("masjid_admin_authed", "true")
        router.push("/admin")
      } else {
        setError("Password salah.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-900">Login Admin</CardTitle>
            <CardDescription className="text-neutral-600">
              Silakan masuk untuk mengelola konten dan kegiatan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password admin"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full bg-neutral-900 hover:bg-black" disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
