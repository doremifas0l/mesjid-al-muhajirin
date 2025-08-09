"use client"

import type React from "react"
import Link from "next/link"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Header from "@/components/header"

const tabs = [
  { href: "/admin/events", label: "Event" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/knowledge", label: "Knowledge" },
  { href: "/admin/homepage", label: "Homepage" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const authed = localStorage.getItem("masjid_admin_authed") === "true"
      if (!authed) router.replace("/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Dashboard</h1>
        <nav className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors hover:bg-neutral-50",
                pathname === t.href
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "border-neutral-200 text-neutral-800",
              )}
              aria-current={pathname === t.href ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
