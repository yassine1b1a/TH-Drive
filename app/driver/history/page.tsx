import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, DollarSign } from "lucide-react"

export default async function DriverHistoryPage() {
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

  const { data: rides } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", user.id)
    .in("status", ["completed", "cancelled"])
    .order("created_at", { ascending: false })

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

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
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ride History</h1>
          <p className="text-muted-foreground">View your completed and cancelled rides</p>
        </div>

        {rides && rides.length > 0 ? (
          <div className="space-y-4">
            {rides.map((ride) => (
              <Card key={ride.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(ride.created_at).toLocaleDateString()}
                    </div>
                  </CardTitle>
                  <Badge className={statusColors[ride.status]}>{ride.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Pickup</p>
                          <p className="text-sm text-muted-foreground">{ride.pickup_address || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">Dropoff</p>
                          <p className="text-sm text-muted-foreground">{ride.dropoff_address || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end md:gap-8">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Distance</p>
                        <p className="font-semibold">{ride.distance_km || 0} km</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-lg font-bold">{ride.fare || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No ride history</h3>
              <p className="text-muted-foreground">Completed rides will appear here</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
