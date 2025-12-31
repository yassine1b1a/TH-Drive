"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Clock, Star, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email, rating")
          .eq("id", user.id)
          .single()
        
        setProfile(profileData)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!userId || !profile) {
    return <div>Please log in to access dashboard</div>
  }

  const quickActions = [
    {
      title: "Book a Ride",
      description: "Request a ride to your destination",
      icon: MapPin,
      href: "/book-ride",
      color: "bg-blue-500",
    },
    {
      title: "Ride History",
      description: "View your past and current rides",
      icon: Clock,
      href: "/dashboard/ride-history",
      color: "bg-green-500",
    },
    {
      title: "My Ratings",
      description: "Check your driver and rider ratings",
      icon: Star,
      href: "/dashboard/ratings",
      color: "bg-yellow-500",
    },
    {
      title: "Support",
      description: "Get help with any issues",
      icon: MessageCircle,
      href: "/dashboard/support",
      color: "bg-purple-500",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          id: profile.id, // Add the id property here
          full_name: profile.full_name || "User",
          email: profile.email || "",
          rating: profile.rating || 5.0,
        }}
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile.full_name || "User"}!</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">{action.title}</CardTitle>
                <CardDescription className="mb-4">{action.description}</CardDescription>
                <Button 
                  onClick={() => router.push(action.href)}
                  className="w-full"
                >
                  Go to {action.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent rides and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">No recent rides</p>
                  <p className="text-sm text-muted-foreground">Book your first ride to see activity here</p>
                </div>
                <Button onClick={() => router.push("/book-ride")}>Book Ride</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
