"use client"

import type React from "react"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, LayoutDashboard, MessageSquare, CalendarDays, Home, Banknote } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function Header() {
  const [authed, setAuthed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(localStorage.getItem("masjid_admin_authed") === "true")
    }
  }, [pathname])

  function handleLogout() {
    localStorage.removeItem("masjid_admin_authed")
    setAuthed(false)
    router.push("/")
  }

  const navLink = (href: string, label: string, icon?: React.ReactNode) => (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        pathname === href ? "bg-emerald-100 text-emerald-900" : "hover:bg-emerald-50 text-emerald-800",
      )}
      aria-current={pathname === href ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700" aria-hidden />
            <span className="text-base sm:text-lg font-semibold text-emerald-900">Mesjid Al-Muhajirin Sarimas</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {navLink("/", "Home", <Home className="h-4 w-4" />)}
            {navLink("/#events", "Events", <CalendarDays className="h-4 w-4" />)}
            {navLink("/#finance", "Keuangan", <Banknote className="h-4 w-4" />)}
            {navLink("/#chat", "Chatbot", <MessageSquare className="h-4 w-4" />)}
            {authed
              ? navLink("/admin/finance", "Dashboard", <LayoutDashboard className="h-4 w-4" />)
              : navLink("/login", "Login", <LogIn className="h-4 w-4" />)}
          </nav>
          <div className="md:hidden">
            {authed ? (
              <Button variant="outline" onClick={() => (window.location.href = "/admin/finance")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            ) : (
              <Button variant="outline" onClick={() => (window.location.href = "/login")}>
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            )}
          </div>
          {authed && (
            <Button variant="ghost" className="hidden md:inline-flex" onClick={handleLogout} aria-label="Log out">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
