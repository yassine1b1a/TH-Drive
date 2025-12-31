import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import { Button } from "@/components/ui/button"
import { Bell, Check, AlertCircle, Info, CheckCircle } from "lucide-react"

export default async function DriverNotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get profile with role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, rating, role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "driver") {
    redirect("/driver")
  }

  const { data: driverDetails } = await supabase
    .from("driver_details")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // Fetch notifications with type-specific icons
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching notifications:", error)
  }

  // Function to mark notification as read
  const markAsRead = async (notificationId: string) => {
    "use server"
    const supabase = await createClient()
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
  }

  // Function to get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DriverSidebar
        user={{
          id: profile.id,
          full_name: profile.full_name || "Driver",
          email: profile.email || "",
          rating: profile.rating || 5.0,
        }}
        vehicle={
          driverDetails
            ? {
                make: driverDetails.vehicle_make,
                model: driverDetails.vehicle_model,
                color: driverDetails.vehicle_color,
                plate: driverDetails.vehicle_plate,
              }
            : undefined
        }
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">Your driver notifications and alerts</p>
            </div>
            <div className="flex items-center gap-2">
              {notifications && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                  {notifications.filter(n => !n.is_read).length} unread
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 ${notification.is_read ? 'bg-muted/30' : 'bg-white dark:bg-gray-900'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{notification.title}</h3>
                        {!notification.is_read && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>
                      {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                        <div className="mt-2 rounded bg-gray-50 p-2 text-xs dark:bg-gray-800">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(notification.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                        {notification.related_type && notification.related_id && (
                          <span className="text-xs text-muted-foreground">
                            Related: {notification.related_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <form action={markAsRead.bind(null, notification.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No notifications</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have any notifications yet. Check back later!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
