"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, User, MessageSquare } from "lucide-react"

export default function RatingsPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
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

  if (!userId) {
    return <div>Please log in to view ratings</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          full_name: profile?.full_name || "User",
          email: profile?.email || "",
          rating: profile?.rating || 5.0,
        }}
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Ratings</h1>
          <p className="text-muted-foreground">View and manage your ratings and reviews</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Overall Rating
              </CardTitle>
              <CardDescription>Your average rating from all rides</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-primary/10 mb-4">
                  <span className="text-3xl font-bold">{profile?.rating?.toFixed(1) || "5.0"}</span>
                </div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(profile?.rating || 5)
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {profile?.total_rides || 0} rides
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Reviews
              </CardTitle>
              <CardDescription>Latest feedback from drivers/passengers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">No reviews yet</h3>
                  <p className="text-muted-foreground">Complete rides to receive ratings and reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating Tips */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Tips for Better Ratings</CardTitle>
              <CardDescription>How to maintain a high rating</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Be punctual and arrive on time</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Maintain a clean and comfortable vehicle</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Drive safely and follow traffic rules</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Communicate clearly with passengers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>Follow the suggested route</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
