"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Star, MessageCircle, Car, DollarSign, Users, TrendingUp, AlertTriangle, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number
  role: "user" | "driver" | "admin" | "moderator"
  total_rides: number
  warnings_count: number
  is_banned: boolean
  ban_reason: string | null  // ADD THIS LINE
}

interface Ride {
  id: string
  status: string
  pickup_address: string | null
  dropoff_address: string | null
  created_at: string
  fare: number | null
}

interface Notification {
  id: string
  title: string
  type: "warning" | "info" | "alert" | "success"
  is_read: boolean
  created_at: string
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentRides, setRecentRides] = useState<Ride[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalRides: 0,
    completedRides: 0,
    pendingRides: 0,
  })
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Fetch profile with id and ban_reason
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, rating, role, total_rides, warnings_count, is_banned, ban_reason")
        .eq("id", user.id)
        .single()
      
      setProfile(profileData)

      // Fetch recent rides
      const { data: ridesData } = await supabase
        .from("rides")
        .select("id, status, pickup_address, dropoff_address, created_at, fare")
        .or(`user_id.eq.${user.id},driver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(5)
      
      setRecentRides(ridesData || [])

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("id, title, type, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)
      
      setNotifications(notificationsData || [])

      // Calculate stats
      const totalSpent = ridesData?.filter(r => r.status === "completed" && r.fare).reduce((sum, ride) => sum + (ride.fare || 0), 0) || 0
      const totalRides = ridesData?.length || 0
      const completedRides = ridesData?.filter(r => r.status === "completed").length || 0
      const pendingRides = ridesData?.filter(r => ["pending", "accepted", "in_progress"].includes(r.status)).length || 0

      setStats({
        totalSpent,
        totalRides,
        completedRides,
        pendingRides,
      })

      setLoading(false)
    }

    fetchData()
  }, [])

  const quickActions = [
    {
      title: "Book a Ride",
      description: "Request a ride to your destination",
      icon: MapPin,
      href: "/book-ride",
      color: "bg-blue-500",
      available: true,
    },
    {
      title: "Ride History",
      description: "View your past and current rides",
      icon: Clock,
      href: "/dashboard/ride-history",
      color: "bg-green-500",
      available: true,
    },
    {
      title: "My Ratings",
      description: "Check your driver and rider ratings",
      icon: Star,
      href: "/dashboard/ratings",
      color: "bg-yellow-500",
      available: true,
    },
    {
      title: "Support",
      description: "Get help with any issues",
      icon: MessageCircle,
      href: "/dashboard/support",
      color: "bg-purple-500",
      available: true,
    },
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <UserSidebar
          user={{
            id: "loading",
            full_name: "Loading...",
            email: "",
            rating: 5.0,
          }}
        />
        <main className="p-4 md:ml-64 md:p-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
        </main>
      </div>
    )
  }

  if (!userId || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p>You need to be logged in to access the dashboard.</p>
          <Button className="mt-4" onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  // Check if user is banned
  if (profile.is_banned) {
    return (
      <div className="min-h-screen bg-background">
        <UserSidebar
          user={{
            id: profile.id,
            full_name: profile.full_name || "User",
            email: profile.email || "",
            rating: profile.rating || 5.0,
          }}
        />
        <main className="p-4 md:ml-64 md:p-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-destructive/10 p-6 rounded-full mb-6">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Account Suspended</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              Your account has been suspended. Please contact support for more information.
            </p>
            {profile.ban_reason && (
              <Card className="mb-6 max-w-md w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Suspension Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{profile.ban_reason}</p>
                </CardContent>
              </Card>
            )}
            <Button onClick={() => router.push("/dashboard/support")}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const isDriver = profile.role === "driver"
  const unreadNotifications = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          id: profile.id,
          full_name: profile.full_name || "User",
          email: profile.email || "",
          rating: profile.rating || 5.0,
        }}
      />
      
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {profile.full_name || "User"}!</p>
            </div>
            <Badge variant={isDriver ? "default" : "outline"} className="flex items-center gap-1">
              {isDriver ? (
                <>
                  <Car className="h-3 w-3" />
                  Driver
                </>
              ) : (
                <>
                  <Users className="h-3 w-3" />
                  Passenger
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Warning Alert */}
        {profile.warnings_count > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">You have {profile.warnings_count} warning(s)</p>
                  <p className="text-sm text-yellow-600">Please review our community guidelines</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-700">
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Rides */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRides}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{stats.completedRides} completed</span>
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.rating.toFixed(1)}/5</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < Math.floor(profile.rating) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Total Spent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Across {stats.completedRides} rides
              </p>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadNotifications}</div>
              <p className="text-xs text-muted-foreground">
                {unreadNotifications > 0 ? 'Unread notifications' : 'All caught up'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Quickly access important features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-32 flex-col gap-3 p-4 hover:shadow-md transition-shadow"
                  onClick={() => router.push(action.href)}
                  disabled={!action.available}
                >
                  <div className={`p-3 rounded-full ${action.color} text-white`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Rides
              </CardTitle>
              <CardDescription>Your recent ride activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRides.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">No rides yet</h3>
                  <p className="text-muted-foreground mb-4">Book your first ride to get started</p>
                  <Button onClick={() => router.push("/book-ride")}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Book a Ride
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentRides.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {ride.pickup_address?.split(",")[0] || "Pickup"} → {ride.dropoff_address?.split(",")[0] || "Dropoff"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {ride.status.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(ride.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {ride.fare && (
                        <div className="font-semibold">${ride.fare.toFixed(2)}</div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/ride-history")}>
                    View All Rides
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
              <CardDescription>Important updates and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">No notifications</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-3 border rounded-lg ${!notification.is_read ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                            notification.type === 'alert' ? 'bg-red-100 text-red-600' :
                            notification.type === 'success' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notification.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                             notification.type === 'alert' ? <Shield className="h-4 w-4" /> :
                             <MessageCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/notifications")}>
                    View All Notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Driver Status (if applicable) */}
        {isDriver && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Driver Status
              </CardTitle>
              <CardDescription>Manage your driver availability and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Online Status</p>
                      <p className="text-sm text-muted-foreground">Go online to receive ride requests</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50">
                    Offline
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button>
                    <Car className="mr-2 h-4 w-4" />
                    Go Online
                  </Button>
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Earnings
                  </Button>
                  <Button variant="outline">
                    <Shield className="mr-2 h-4 w-4" />
                    Driver Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
