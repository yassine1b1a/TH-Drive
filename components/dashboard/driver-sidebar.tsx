"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Car, MapPin, Clock, Star, MessageCircle,Bell, LogOut, Menu, X, Settings } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface DriverSidebarProps {
  user: {
    full_name: string | null
    email: string
    rating: number
  }
  vehicle?: {
    make: string
    model: string
    color: string
    plate: string
  }
}

export function DriverSidebar({ user, vehicle }: DriverSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const navItems = [
    { href: "/driver", icon: MapPin, label: "Available Rides" },
    { href: "/driver/active", icon: Car, label: "Active Ride" },
    { href: "/driver/history", icon: Clock, label: "Ride History" },
    { href: "/driver/earnings", icon: Star, label: "Earnings" },
    { 
      href: "/dashboard/notifications", 
      icon: Bell, 
      label: "Notifications",
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { href: "/driver/support", icon: MessageCircle, label: "Support" },
    { href: "/driver/settings", icon: Settings, label: "Settings" },
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
          <Car className="h-8 w-8 text-primary" />
          <div>
            <span className="text-xl font-bold">TH-Drive</span>
            <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Driver</span>
          </div>
        </div>

        {/* Driver info */}
        <div className="border-b border-border p-4">
          <p className="font-medium">{user.full_name || "Driver"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{user.rating.toFixed(1)}</span>
          </div>
          {vehicle && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>
                {vehicle.color} {vehicle.make} {vehicle.model}
              </p>
              <p>{vehicle.plate}</p>
            </div>
          )}
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
