import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DriverSidebar } from "@/components/dashboard/driver-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Car, Calendar } from "lucide-react"

export default async function EarningsPage() {
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

  // Get completed rides
  const { data: rides } = await supabase
    .from("rides")
    .select("fare, completed_at")
    .eq("driver_id", user.id)
    .eq("status", "completed")

  // Calculate earnings
  const totalEarnings = rides?.reduce((sum, ride) => sum + (ride.fare || 0), 0) || 0
  const totalRides = rides?.length || 0
  const averageFare = totalRides > 0 ? totalEarnings / totalRides : 0

  // Today's earnings
  const today = new Date().toISOString().split("T")[0]
  const todaysRides = rides?.filter((ride) => ride.completed_at?.startsWith(today)) || []
  const todaysEarnings = todaysRides.reduce((sum, ride) => sum + (ride.fare || 0), 0)

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
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">Track your income and performance</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{"Today's Earnings"}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${todaysEarnings.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">{todaysRides.length} rides today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rides</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRides}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Fare</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averageFare.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
