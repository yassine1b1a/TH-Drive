"use client"

import { useState, useEffect } from "react"
import { DriverMap, getRoute } from "@/components/map/driver-map"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MapPin, Clock, DollarSign, Navigation, Loader2, Car, AlertCircle, Compass } from "lucide-react"
import type { LatLng, Ride } from "@/lib/types"
import { calculateDistance, estimateArrivalTime, findNearestDriver } from "@/lib/ride/calculations"

interface AvailableRidesProps {
  driverId: string
  driverDetailsId: string
}

// Maximum distance for showing rides (in kilometers)
const MAX_DISTANCE_KM = 15

export function AvailableRides({ driverId, driverDetailsId }: AvailableRidesProps) {
  const [isOnline, setIsOnline] = useState(false)
  const [rides, setRides] = useState<Ride[]>([])
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)
  const [route, setRoute] = useState<LatLng[]>([])
  const [isAccepting, setIsAccepting] = useState(false)
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number }>({ distance: 0, duration: 0 })
  const [isLoadingRides, setIsLoadingRides] = useState(false)
  const [locationPermission, setLocationPermission] = useState<PermissionState | null>(null)
  const [showDistanceFilter, setShowDistanceFilter] = useState(true)

  useEffect(() => {
    loadDriverStatus()
    checkLocationPermission()
  }, [])

  useEffect(() => {
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
          
          // Reload rides when location changes significantly
          loadAvailableRides()
        },
        (error) => {
          console.error("Geolocation error:", error)
          if (error.code === 1) {
            setLocationPermission('denied')
          }
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline])

  const checkLocationPermission = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        setLocationPermission(result.state)
        result.onchange = () => {
          setLocationPermission(result.state)
        }
      } catch (error) {
        console.error("Error checking location permission:", error)
      }
    }
  }

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
    if (!isOnline) return
    
    setIsLoadingRides(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })

      if (error) throw error

      let filteredRides = data || []
      
      // Filter by distance if driver location is available
      if (driverLocation && showDistanceFilter) {
        // Calculate distance for each ride and add it as a property
        const ridesWithDistance = filteredRides.map(ride => {
          const distance = calculateDistance(
            driverLocation.lat,
            driverLocation.lng,
            ride.pickup_lat,
            ride.pickup_lng
          )
          return { ...ride, distance }
        })
        
        // Filter by max distance and sort by distance (closest first)
        filteredRides = ridesWithDistance
          .filter(ride => ride.distance <= MAX_DISTANCE_KM)
          .sort((a, b) => a.distance - b.distance)
        
        console.log(`Found ${filteredRides.length} rides within ${MAX_DISTANCE_KM}km`)
      } else if (driverLocation) {
        // Just sort by distance if not filtering
        const ridesWithDistance = filteredRides.map(ride => {
          const distance = calculateDistance(
            driverLocation.lat,
            driverLocation.lng,
            ride.pickup_lat,
            ride.pickup_lng
          )
          return { ...ride, distance }
        })
        filteredRides = ridesWithDistance.sort((a, b) => a.distance - b.distance)
      }

      setRides(filteredRides)
      
      // Auto-select the closest ride if none selected
      if (!selectedRide && filteredRides.length > 0) {
        setSelectedRide(filteredRides[0])
      }

    } catch (error) {
      console.error("Error loading available rides:", error)
    } finally {
      setIsLoadingRides(false)
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
              loadAvailableRides()
            },
            (error) => {
              console.error("Geolocation error:", error)
              if (error.code === 1) {
                setLocationPermission('denied')
                alert('Location permission is required to see nearby rides. Please enable location services.')
              }
            }
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

  const getDistanceToRide = (ride: Ride) => {
    if (!driverLocation) return null
    
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      ride.pickup_lat,
      ride.pickup_lng
    )
    
    return distance.toFixed(1)
  }

  const getEstimatedArrivalTime = (ride: Ride) => {
    if (!driverLocation) return null
    
    const distance = parseFloat(getDistanceToRide(ride) || '0')
    // Estimate arrival time (assuming average speed of 30 km/h in city)
    const timeHours = distance / 30
    const timeMinutes = timeHours * 60
    
    return Math.ceil(timeMinutes + 5) // Add 5 minutes buffer
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
            <div className={`h-3 w-3 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <div>
              <p className="font-medium">{isOnline ? "Online - Receiving Rides" : "Offline"}</p>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? driverLocation 
                    ? `Showing rides within ${MAX_DISTANCE_KM}km` 
                    : "Waiting for location..."
                  : "Go online to receive rides"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="online-toggle" className="sr-only">
              Online status
            </Label>
            <Switch 
              id="online-toggle" 
              checked={isOnline} 
              onCheckedChange={toggleOnlineStatus}
              disabled={isOnline && locationPermission === 'denied'}
            />
          </div>
        </CardContent>
        
        {isOnline && locationPermission === 'denied' && (
          <div className="px-4 pb-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Location permission required</p>
                <p>Please enable location services to see rides near you. Without location, you won&apos;t see nearby rides.</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {isOnline && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Available Rides List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Available Rides</h2>
                <p className="text-sm text-muted-foreground">
                  {driverLocation 
                    ? `${rides.length} rides within ${MAX_DISTANCE_KM}km` 
                    : `${rides.length} total rides`
                  }
                </p>
              </div>
              
              {driverLocation && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filter by distance</span>
                  <Switch 
                    checked={showDistanceFilter} 
                    onCheckedChange={setShowDistanceFilter}
                  />
                </div>
              )}
            </div>
            
            {isLoadingRides ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Looking for nearby rides...</p>
                </CardContent>
              </Card>
            ) : rides.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Car className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {driverLocation 
                      ? `No rides within ${MAX_DISTANCE_KM}km` 
                      : "No rides available"
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    {driverLocation 
                      ? "Check back in a few minutes or try a different location"
                      : "Turn on location to see rides near you"
                    }
                  </p>
                  {!driverLocation && isOnline && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
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
                      }}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Enable Location
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              rides.map((ride) => {
                const distance = getDistanceToRide(ride)
                const arrivalTime = getEstimatedArrivalTime(ride)
                
                return (
                  <Card
                    key={ride.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRide?.id === ride.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedRide(ride)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ride.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Badge>
                          {distance && (
                            <Badge variant="secondary" className="gap-1">
                              <Compass className="h-3 w-3" />
                              {distance} km
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-lg font-bold">
                          <DollarSign className="h-4 w-4" />
                          {ride.fare?.toFixed(2) || "0.00"}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Pickup</p>
                          <p className="text-sm text-muted-foreground">
                            {ride.pickup_address || `${ride.pickup_lat.toFixed(4)}, ${ride.pickup_lng.toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Dropoff</p>
                          <p className="text-sm text-muted-foreground">
                            {ride.dropoff_address || `${ride.dropoff_lat.toFixed(4)}, ${ride.dropoff_lng.toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Ride Distance</p>
                          <p className="font-semibold">{ride.distance_km?.toFixed(1) || "N/A"} km</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-semibold">{ride.estimated_duration_min || "N/A"} min</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-muted-foreground">You Arrive In</p>
                          <p className="font-semibold">{arrivalTime || "N/A"} min</p>
                        </div>
                      </div>

                      {selectedRide?.id === ride.id && driverLocation && (
                        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-blue-900">Route to pickup:</span>
                            <Badge variant="outline" className="bg-white">
                              {routeInfo.distance.toFixed(1)} km • {Math.round(routeInfo.duration)} min
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-blue-700">
                            <span>Your location to pickup</span>
                            <span>{distance} km • ~{arrivalTime} min</span>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        className="w-full" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAcceptRide(ride)
                        }} 
                        disabled={isAccepting}
                        size="lg"
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <Car className="mr-2 h-4 w-4" />
                            Accept Ride • ${ride.fare?.toFixed(2) || "0.00"}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Map */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedRide 
                    ? `Ride to ${selectedRide.dropoff_address?.split(",")[0] || "Destination"}` 
                    : driverLocation 
                      ? "Nearby Rides Map"
                      : "Map View"
                  }
                </CardTitle>
                {driverLocation && (
                  <Badge variant="outline" className="gap-1">
                    <Navigation className="h-3 w-3" />
                    You are here
                  </Badge>
                )}
              </div>
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
                showUserLocation={!!driverLocation}
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
              
              {!driverLocation && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                  <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-sm mx-4">
                    <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Location Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Enable location services to see rides on the map and calculate distances.
                    </p>
                    <Button
                      onClick={() => {
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
                      }}
                    >
                      Enable Location
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
