"use client"

import { useState, useEffect } from "react"
import { DriverMap, getRoute } from "@/components/map/driver-map"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MapPin, Clock, DollarSign, Navigation, Loader2 } from "lucide-react"
import type { LatLng, Ride } from "@/lib/types"

interface AvailableRidesProps {
  driverId: string
  driverDetailsId: string
}

export function AvailableRides({ driverId, driverDetailsId }: AvailableRidesProps) {
  const [isOnline, setIsOnline] = useState(false)
  const [rides, setRides] = useState<Ride[]>([])
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)
  const [route, setRoute] = useState<LatLng[]>([])
  const [isAccepting, setIsAccepting] = useState(false)
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number }>({ distance: 0, duration: 0 })

  useEffect(() => {
    loadDriverStatus()
    if (isOnline) {
      loadAvailableRides()
      const interval = setInterval(loadAvailableRides, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [isOnline])

  useEffect(() => {
    if (selectedRide && driverLocation) {
      fetchRoute(selectedRide)
    }
  }, [selectedRide, driverLocation])

  // Get driver location and update it
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setDriverLocation(location)
          await updateDriverLocation(location)
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline])

  const loadDriverStatus = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase.from("driver_details").select("is_online").eq("id", driverDetailsId).single()

      if (data) {
        setIsOnline(data.is_online)
      }
    } catch (error) {
      console.error("Error loading driver status:", error)
    }
  }

  const loadAvailableRides = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })

      if (data) {
        setRides(data)
      }
    } catch (error) {
      console.error("Error loading available rides:", error)
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
        .eq("id", driverDetailsId)
    } catch (error) {
      console.error("Error updating driver location:", error)
    }
  }

  const toggleOnlineStatus = async (online: boolean) => {
    try {
      const supabase = createClient()
      await supabase.from("driver_details").update({ is_online: online }).eq("id", driverDetailsId)

      setIsOnline(online)
      if (!online) {
        setRides([])
        setSelectedRide(null)
      } else {
        // When going online, get current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }
              setDriverLocation(location)
              updateDriverLocation(location)
            },
            (error) => console.error("Geolocation error:", error)
          )
        }
      }
    } catch (error) {
      console.error("Error toggling online status:", error)
    }
  }

  const fetchRoute = async (ride: Ride) => {
    if (!driverLocation) return

    const result = await getRoute(driverLocation, { lat: ride.pickup_lat, lng: ride.pickup_lng })
    setRoute(result.route)
    setRouteInfo({ distance: result.distance, duration: result.duration })
  }

  const handleAcceptRide = async (ride: Ride) => {
    setIsAccepting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("rides")
        .update({
          driver_id: driverId,
          status: "accepted",
        })
        .eq("id", ride.id)
        .eq("status", "pending") // Only accept if still pending

      if (error) throw error

      // Redirect to active ride page
      window.location.href = "/driver/active"
    } catch (error) {
      console.error("Error accepting ride:", error)
      alert("This ride is no longer available. Please select another ride.")
      loadAvailableRides() // Refresh the list
    } finally {
      setIsAccepting(false)
    }
  }

  const markers = [
    ...(selectedRide
      ? [
          {
            position: { lat: selectedRide.pickup_lat, lng: selectedRide.pickup_lng },
            type: "pickup" as const,
            label: "Pickup",
          },
          {
            position: { lat: selectedRide.dropoff_lat, lng: selectedRide.dropoff_lng },
            type: "dropoff" as const,
            label: "Dropoff",
          },
        ]
      : []),
    ...(driverLocation ? [{ position: driverLocation, type: "driver" as const, label: "You" }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Online Toggle */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
            <div>
              <p className="font-medium">{isOnline ? "Online" : "Offline"}</p>
              <p className="text-sm text-muted-foreground">
                {isOnline ? "Receiving ride requests" : "Go online to receive rides"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="online-toggle" className="sr-only">
              Online status
            </Label>
            <Switch id="online-toggle" checked={isOnline} onCheckedChange={toggleOnlineStatus} />
          </div>
        </CardContent>
      </Card>

      {isOnline && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Available Rides List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Rides ({rides.length})</h2>
            {rides.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Navigation className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No rides available right now</p>
                  <p className="text-sm text-muted-foreground">New ride requests will appear here</p>
                </CardContent>
              </Card>
            ) : (
              rides.map((ride) => (
                <Card
                  key={ride.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRide?.id === ride.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedRide(ride)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(ride.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                      <div className="flex items-center gap-1 text-lg font-bold">
                        <DollarSign className="h-4 w-4" />
                        {ride.fare?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-green-500" />
                      <p className="text-sm">
                        {ride.pickup_address || `${ride.pickup_lat.toFixed(4)}, ${ride.pickup_lng.toFixed(4)}`}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
                      <p className="text-sm">
                        {ride.dropoff_address || `${ride.dropoff_lat.toFixed(4)}, ${ride.dropoff_lng.toFixed(4)}`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{ride.distance_km?.toFixed(1) || "N/A"} km</span>
                      <span>{ride.estimated_duration_min || "N/A"} min</span>
                    </div>
                    {selectedRide?.id === ride.id && driverLocation && (
                      <div className="rounded bg-blue-50 p-3 text-sm">
                        <div className="flex justify-between">
                          <span>Distance to pickup:</span>
                          <span className="font-medium">{routeInfo.distance.toFixed(1)} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time to pickup:</span>
                          <span className="font-medium">{Math.round(routeInfo.duration)} min</span>
                        </div>
                      </div>
                    )}
                    <Button className="w-full" onClick={() => handleAcceptRide(ride)} disabled={isAccepting}>
                      {isAccepting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Ride"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Map */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>
                {selectedRide ? `Ride to ${selectedRide.dropoff_address?.split(",")[0] || "Destination"}` : "Map View"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[500px] p-0">
              <DriverMap
                center={
                  selectedRide
                    ? { lat: selectedRide.pickup_lat, lng: selectedRide.pickup_lng }
                    : driverLocation || { lat: 0, lng: 0 }
                }
                markers={markers}
                route={route}
                showUserLocation={false}
                interactive
                onRouteCalculated={(routeData) => {
                  if (routeData && selectedRide) {
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
      )}
    </div>
  )
}