"use client"

import { RideHistory } from "@/components/ride-history"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { UserSidebar } from "@/components/dashboard/user-sidebar"

export default function UserRidesPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Get profile
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
    return <div>Please log in to view your ride history</div>
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
          <h1 className="text-3xl font-bold">My Rides</h1>
          <p className="text-muted-foreground">View your ride history</p>
        </div>
        <RideHistory userId={userId} role="user" />
      </main>
    </div>
  )
}
