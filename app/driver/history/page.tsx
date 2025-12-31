"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import RideHistory from "@/components/ride-history"

// Or define the interface locally
interface UserProfile {
  id: string
  full_name: string
  email: string
  rating: number
}

export default function DriverHistoryPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [driverDetails, setDriverDetails] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Get profile - include id in select
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email, rating")
          .eq("id", user.id)
          .single()
        
        setProfile(profileData)
        
        // Get driver details
        const { data: driverData } = await supabase
          .from("driver_details")
          .select("*")
          .eq("user_id", user.id)
          .single()
        
        setDriverDetails(driverData)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DriverSidebar
          user={{
            id: "loading", // Add id for loading state
            full_name: "Loading...",
            email: "",
            rating: 5.0,
          }}
          vehicle={{
            make: "",
            model: "",
            color: "",
            plate: "",
          }}
        />
        <main className="p-4 md:ml-64 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!userId || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Please log in to view your ride history</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DriverSidebar
        user={{
          id: profile.id, // Add this line - use actual profile id
          full_name: profile.full_name || "Driver",
          email: profile.email || "",
          rating: profile.rating || 5.0,
        }}
        vehicle={{
          make: driverDetails?.vehicle_make || "",
          model: driverDetails?.vehicle_model || "",
          color: driverDetails?.vehicle_color || "",
          plate: driverDetails?.vehicle_plate || "",
        }}
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Driver History</h1>
          <p className="text-muted-foreground">View your completed rides and earnings</p>
        </div>
        
        {/* Use the RideHistory component with driver role */}
        <RideHistory userId={userId} role="driver" />
      </main>
    </div>
  )
}
