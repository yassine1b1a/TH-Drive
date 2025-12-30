"use client"

import { RideHistory } from "@/components/ride-history"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"

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
        
        // Get profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
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
      <DriverSidebar
        user={{
          full_name: profile?.full_name || "Driver",
          email: profile?.email || "",
          rating: profile?.rating || 5.0,
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
        <RideHistory userId={userId} role="driver" />
      </main>
    </div>
  )
}
