"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Car, Users, AlertTriangle, Shield, BarChart3, LogOut, Menu, X, Flag } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  user: {
    full_name: string | null
    email: string
    role: string
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const navItems = [
    { href: "/admin", icon: BarChart3, label: "Overview" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/drivers", icon: Car, label: "Drivers" },
    { href: "/admin/alerts", icon: AlertTriangle, label: "Alerts" },
    { href: "/admin/violations", icon: Flag, label: "Violations" },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card transition-transform md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <span className="text-xl font-bold">TH-Drive</span>
            <span className="ml-2 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Admin</span>
          </div>
        </div>

        {/* User info */}
        <div className="border-b border-border p-4">
          <p className="font-medium">{user.full_name || "Admin"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-primary capitalize">{user.role}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign out */}
        <div className="border-t border-border p-4">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
