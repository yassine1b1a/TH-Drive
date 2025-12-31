import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"

export default async function DriverSupportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

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

  return (
    <div className="min-h-screen bg-background">
      <DriverSidebar
        user={{
          id: profile.id,
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
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Get help with your account or rides</p>
        </div>
        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-semibold">Contact Support</h3>
            <p className="text-muted-foreground">Email: support@th-drive.com</p>
            <p className="text-muted-foreground">Phone: 1-800-TH-DRIVE</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Our support team is available 24/7 to assist you with any issues.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}