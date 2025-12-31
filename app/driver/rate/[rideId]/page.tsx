import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import { RateUser } from "@/components/driver/rate-user"

// Add Profile interface with id
interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number | null
  role?: string
}

export default async function RateUserPage({ params }: { params: Promise<{ rideId: string }> }) {
  const { rideId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Update query to include id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, rating, role")
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

  const { data: ride } = await supabase
    .from("rides")
    .select("*, user:profiles!rides_user_id_fkey(*)")
    .eq("id", rideId)
    .single()

  if (!ride || ride.driver_id !== user.id) {
    redirect("/driver")
  }

  return (
    <div className="min-h-screen bg-background">
      <DriverSidebar
        user={{
          id: profile.id, // Add this
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
          <h1 className="text-3xl font-bold">Rate Passenger</h1>
          <p className="text-muted-foreground">How was your experience with this passenger?</p>
        </div>
        <RateUser
          rideId={rideId}
          raterId={user.id}
          ratedId={ride.user_id}
          ratedName={ride.user?.full_name || "Passenger"}
        />
      </main>
    </div>
  )
}
