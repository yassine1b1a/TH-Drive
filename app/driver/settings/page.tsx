import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import { DriverSettings } from "@/components/driver/driver-settings"

// Add Profile interface with id
interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number | null
  role?: string
  // Add other profile fields if needed
  phone?: string | null
  avatar_url?: string | null
}

export default async function DriverSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Update query to include id and any other needed fields
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, rating, role, phone, avatar_url")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "driver") {
    redirect("/dashboard")
  }

  const { data: driverDetails } = await supabase
    .from("driver_details")
    .select("*")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <DriverSidebar
        user={{
          id: profile.id, // Add this line
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and vehicle information</p>
        </div>
        <DriverSettings profile={profile} driverDetails={driverDetails} />
      </main>
    </div>
  )
}
