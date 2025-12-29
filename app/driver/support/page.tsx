import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import { DriverSupportChat } from "@/components/support/driver-support-chat"

export default async function DriverSupportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "driver") {
    redirect("/dashboard")
  }

  const { data: driverDetails } = await supabase.from("driver_details").select("*").eq("user_id", user.id).single()

  return (
    <div className="min-h-screen bg-background">
      <DriverSidebar
        user={{
          full_name: profile.full_name,
          email: profile.email,
          rating: profile.rating,
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
      <main className="p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Driver Support</h1>
          <p className="text-muted-foreground">Get help with your driver account and rides</p>
        </div>
        <DriverSupportChat userId={user.id} />
      </main>
    </div>
  )
}
