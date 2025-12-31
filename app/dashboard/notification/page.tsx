"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Info,
  Trash2,
  AlertCircle,
  CheckCircle,
  MessageSquareWarning,
  LucideIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"

// Define the Notification interface
interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "warning" | "info" | "alert" | "success"
  is_read: boolean
  created_at: string
  related_type?: string
  related_id?: string
  metadata?: Record<string, any>
}

// Define getIcon function outside so it can be reused
const getIcon = (type: Notification["type"]): JSX.Element => {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case "alert":
      return <AlertCircle className="h-5 w-5 text-red-500" />
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "info":
    default:
      return <Info className="h-5 w-5 text-blue-500" />
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
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
  }, [])

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setNotifications(data || [])
      const unread = data?.filter(n => !n.is_read).length || 0
      setUnreadCount(unread)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      setSelectedNotifications([])
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", notificationIds)

      if (error) throw error

      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)))
      const deletedUnreadCount = notifications.filter(
        n => notificationIds.includes(n.id) && !n.is_read
      ).length
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount))
      setSelectedNotifications([])
    } catch (error) {
      console.error("Error deleting notifications:", error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id])
    }

    // Handle navigation based on notification type
    if (notification.related_type === "ride") {
      router.push(`/dashboard/ride-history?ride=${notification.related_id}`)
    } else if (notification.related_type === "moderation_alert") {
      router.push(`/dashboard/support?alert=${notification.related_id}`)
    } else if (notification.related_type === "violation") {
      router.push(`/dashboard/support?violation=${notification.related_id}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedNotifications.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsRead(selectedNotifications)}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark as Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteNotifications(selectedNotifications)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Warnings
            <Badge variant="secondary" className="ml-2">
              {notifications.filter(n => n.type === "warning").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationList
            notifications={notifications}
            selectedNotifications={selectedNotifications}
            onSelect={setSelectedNotifications}
            onClick={handleNotificationClick}
            getIcon={getIcon}
          />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <NotificationList
            notifications={notifications.filter(n => !n.is_read)}
            selectedNotifications={selectedNotifications}
            onSelect={setSelectedNotifications}
            onClick={handleNotificationClick}
            getIcon={getIcon}
          />
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          <NotificationList
            notifications={notifications.filter(n => n.type === "warning")}
            selectedNotifications={selectedNotifications}
            onSelect={setSelectedNotifications}
            onClick={handleNotificationClick}
            getIcon={getIcon}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface NotificationListProps {
  notifications: Notification[]
  selectedNotifications: string[]
  onSelect: (ids: string[]) => void
  onClick: (notification: Notification) => void
  getIcon: (type: Notification["type"]) => JSX.Element
}

function NotificationList({
  notifications,
  selectedNotifications,
  onSelect,
  onClick,
  getIcon,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No notifications</h3>
          <p className="text-sm text-muted-foreground text-center">
            You're all caught up! Check back later for updates.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            !notification.is_read ? "bg-blue-50/50 border-blue-200" : ""
          }`}
          onClick={() => onClick(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selectedNotifications.includes(notification.id)}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelect([...selectedNotifications, notification.id])
                  } else {
                    onSelect(selectedNotifications.filter(id => id !== notification.id))
                  }
                }}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(notification.type)}
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.is_read && (
                      <Badge variant="outline" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {notification.message}
                </p>
                {notification.metadata && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {notification.metadata.reason && (
                      <p>Reason: {notification.metadata.reason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
