"use client"

import { useState, useEffect } from "react"
import { DriverMap, getRoute } from "@/components/map/driver-map"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Navigation, CheckCircle, Loader2 } from "lucide-react"
import type { LatLng, Ride, Profile } from "@/lib/types"

interface ActiveRideProps {
  driverId: string
}

export function ActiveRide({ driverId }: ActiveRideProps) {
  const [ride, setRide] = useState<(Ride & { user?: Profile }) | null>(null)
  const [route, setRoute] = useState<LatLng[]>([])
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number }>({ distance: 0, duration: 0 })

  useEffect(() => {
    loadActiveRide()
  }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setDriverLocation(location)
          updateDriverLocation(location)
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    if (ride && driverLocation) {
      fetchRoute()
    }
  }, [ride, driverLocation])

  const loadActiveRide = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", driverId)
        .in("status", ["accepted", "in_progress"])
        .single()

      if (data) {
        // Get user info
        const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", data.user_id).single()

        setRide({ ...data, user: userProfile || undefined })
      }
    } catch (error) {
      console.error("Error loading ride:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateDriverLocation = async (location: LatLng) => {
    try {
      const supabase = createClient()
      await supabase
        .from("driver_details")
        .update({
          current_lat: location.lat,
          current_lng: location.lng,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", driverId)
    } catch (error) {
      console.error("Error updating driver location:", error)
    }
  }

  const fetchRoute = async () => {
    if (!ride || !driverLocation) return

    const destination =
      ride.status === "accepted"
        ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
        : { lat: ride.dropoff_lat, lng: ride.dropoff_lng }

    const result = await getRoute(driverLocation, destination)
    setRoute(result.route)
    setRouteInfo({ distance: result.distance, duration: result.duration })
  }

  const handleStartRide = async () => {
    if (!ride) return
    setIsUpdating(true)

    try {
      const supabase = createClient()
      await supabase
        .from("rides")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", ride.id)

      setRide({ ...ride, status: "in_progress" })
    } catch (error) {
      console.error("Error starting ride:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCompleteRide = async () => {
    if (!ride) return
    setIsUpdating(true)

    try {
      const supabase = createClient()
      await supabase
        .from("rides")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          payment_status: "completed",
        })
        .eq("id", ride.id)

      // Redirect to rating page
      window.location.href = `/driver/rate/${ride.id}`
    } catch (error) {
      console.error("Error completing ride:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelRide = async () => {
    if (!ride) return
    setIsUpdating(true)

    try {
      const supabase = createClient()
      await supabase.from("rides").update({ status: "cancelled", driver_id: null }).eq("id", ride.id)

      window.location.href = "/driver"
    } catch (error) {
      console.error("Error cancelling ride:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!ride) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Navigation className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Active Ride</h3>
          <p className="text-muted-foreground">Accept a ride to see it here</p>
          <Button className="mt-4" onClick={() => (window.location.href = "/driver")}>
            View Available Rides
          </Button>
        </CardContent>
      </Card>
    )
  }

  const markers = [
    { position: { lat: ride.pickup_lat, lng: ride.pickup_lng }, type: "pickup" as const, label: "Pickup" },
    { position: { lat: ride.dropoff_lat, lng: ride.dropoff_lng }, type: "dropoff" as const, label: "Dropoff" },
    ...(driverLocation ? [{ position: driverLocation, type: "driver" as const, label: "You" }] : []),
  ]

  const statusColors: Record<string, string> = {
    accepted: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Ride Details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Ride</CardTitle>
              <Badge className={statusColors[ride.status]}>
                {ride.status === "accepted" ? "Picking Up" : "In Progress"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Passenger Info */}
            {ride.user && (
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div>
                  <p className="font-medium">{ride.user.full_name || "Passenger"}</p>
                  <p className="text-sm text-muted-foreground">{ride.user.phone || "No phone"}</p>
                </div>
                {ride.user.phone && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={`tel:${ride.user.phone}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Locations */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Pickup</p>
                  <p className="text-sm text-muted-foreground">{ride.pickup_address || "No address provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Dropoff</p>
                  <p className="text-sm text-muted-foreground">{ride.dropoff_address || "No address provided"}</p>
                </div>
              </div>
            </div>

            {/* Trip Info */}
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted p-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-lg font-semibold">{routeInfo.distance.toFixed(1) || ride.distance_km || "N/A"} km</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-lg font-semibold">
                  {Math.round(routeInfo.duration) || ride.estimated_duration_min || "N/A"} min
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fare</p>
                <p className="text-lg font-semibold">${ride.fare || "0.00"}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {ride.status === "accepted" && (
                <Button className="w-full" size="lg" onClick={handleStartRide} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="mr-2 h-4 w-4" />
                  )}
                  Start Ride
                </Button>
              )}
              {ride.status === "in_progress" && (
                <Button className="w-full" size="lg" onClick={handleCompleteRide} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Complete Ride
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleCancelRide}
                disabled={isUpdating}
              >
                Cancel Ride
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{ride.status === "accepted" ? "Navigate to Pickup" : "Navigate to Dropoff"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[500px] p-0">
          <DriverMap
            center={driverLocation || markers[0]?.position}
            markers={markers}
            route={route}
            showUserLocation={false}
            interactive
            onRouteCalculated={(routeData) => {
              if (routeData) {
                setRouteInfo({
                  distance: routeData.distance,
                  duration: routeData.duration,
                })
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}