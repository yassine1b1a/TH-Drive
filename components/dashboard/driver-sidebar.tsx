"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Car, MapPin, Clock, Star, MessageCircle, Bell, LogOut, Menu, X, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface DriverSidebarProps {
  user: {
    id: string  // ADD THIS - ID is required for notifications
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
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchUnreadCount()
    
    // Subscribe to notifications
    const channel = supabase
      .channel('driver-sidebar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.is_read && !payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }

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
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 transition-colors group",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    {item.badge && (
                      <Badge 
                        variant="default" 
                        className={cn(
                          "h-5 w-5 min-w-5 p-0 flex items-center justify-center text-xs",
                          isActive 
                            ? "bg-primary-foreground text-primary" 
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sign out */}
        <div className="border-t border-border p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
