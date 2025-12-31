"use client"

import RideHistory from "@/components/ride-history"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { UserSidebar } from "@/components/dashboard/user-sidebar"

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number | null
}

export default function UserRidesPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Get profile - MAKE SURE TO SELECT ID
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
      <div className="min-h-screen bg-background">
        <UserSidebar
          user={{
            id: "loading", // Add temporary id for loading state
            full_name: "Loading...",
            email: "",
            rating: 5.0,
          }}
        />
        <main className="p-4 md:ml-64 md:p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!userId || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Please log in to view your ride history</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          id: profile.id, // ADD THIS REQUIRED PROPERTY
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
