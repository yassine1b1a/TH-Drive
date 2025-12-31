// Template for other dashboard pages
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Skeleton } from "@/components/ui/skeleton"

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number
}

export default function SomeDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, rating")
        .eq("id", user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <div className="hidden md:block w-64">
            <Skeleton className="h-screen" />
          </div>
          <div className="flex-1 p-8">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <div>Error loading profile</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          id: profile.id, // Make sure to include the id
          full_name: profile.full_name,
          email: profile.email,
          rating: profile.rating,
        }}
      />
      
      <main className="p-4 md:p-8 pt-20 md:pt-8 md:ml-64">
        {/* Your page content here */}
        <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
        {/* Rest of your page content */}
      </main>
    </div>
  )
}
