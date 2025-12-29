import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ReportViolation } from "@/components/user/report-violation"
import { MapPin, Calendar, DollarSign, Star } from "lucide-react"
import Link from "next/link"

export default async function RidesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: rides } = await supabase
    .from("rides")
    .select("*, driver:profiles!rides_driver_id_fkey(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Get existing ratings to check which rides have been rated
  const { data: ratings } = await supabase.from("ratings").select("ride_id").eq("rater_id", user.id)

  const ratedRideIds = new Set(ratings?.map((r) => r.ride_id) || [])

  if (!profile) {
    redirect("/auth/login")
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          full_name: profile.full_name,
          email: profile.email,
          rating: profile.rating,
        }}
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Rides</h1>
          <p className="text-muted-foreground">View your ride history</p>
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
                  <Badge className={statusColors[ride.status]}>{ride.status.replace("_", " ")}</Badge>
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
                    <div className="flex flex-col justify-between">
                      <div className="flex items-center justify-between md:justify-end md:gap-8">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Distance</p>
                          <p className="font-semibold">{ride.distance_km || 0} km</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-semibold">{ride.estimated_duration_min || 0} min</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-bold">{ride.fare || 0}</span>
                        </div>
                      </div>
                      {/* Actions for completed rides */}
                      {ride.status === "completed" && ride.driver_id && (
                        <div className="mt-4 flex items-center justify-end gap-2">
                          {!ratedRideIds.has(ride.id) && (
                            <Link href={`/dashboard/rate/${ride.id}`}>
                              <Button size="sm">
                                <Star className="mr-1 h-4 w-4" />
                                Rate Driver
                              </Button>
                            </Link>
                          )}
                          <ReportViolation
                            reporterId={user.id}
                            reportedUserId={ride.driver_id}
                            rideId={ride.id}
                            reportedUserName={ride.driver?.full_name || "Driver"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No rides yet</h3>
              <p className="text-muted-foreground">Book your first ride to get started!</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
