"use client"

import { useState, useEffect } from "react"
import { MapComponent, searchAddress, getRoute } from "@/components/map/map-component"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MapPin, Navigation, CreditCard, QrCode, Loader2, Clock, Route } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { LatLng } from "@/lib/types"

interface RideBookingProps {
  userId: string
}

interface SearchResult {
  lat: number
  lng: number
  display_name: string
}

export function RideBooking({ userId }: RideBookingProps) {
  const [pickup, setPickup] = useState<{ location: LatLng; address: string } | null>(null)
  const [dropoff, setDropoff] = useState<{ location: LatLng; address: string } | null>(null)
  const [pickupSearch, setPickupSearch] = useState("")
  const [dropoffSearch, setDropoffSearch] = useState("")
  const [pickupResults, setPickupResults] = useState<SearchResult[]>([])
  const [dropoffResults, setDropoffResults] = useState<SearchResult[]>([])
  const [route, setRoute] = useState<LatLng[]>([])
  const [distance, setDistance] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [fare, setFare] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "qr_code">("card")
  const [isBooking, setIsBooking] = useState(false)
  const [selectingType, setSelectingType] = useState<"pickup" | "dropoff" | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const BASE_FARE = 2.5
  const PER_KM_RATE = 1.2

  useEffect(() => {
    if (pickup && dropoff) {
      fetchRoute()
    }
  }, [pickup, dropoff])

  useEffect(() => {
    if (distance > 0) {
      const calculatedFare = BASE_FARE + distance * PER_KM_RATE
      setFare(Math.round(calculatedFare * 100) / 100)
    }
  }, [distance])

  const fetchRoute = async () => {
    if (!pickup || !dropoff) return
    const result = await getRoute(pickup.location, dropoff.location)
    setRoute(result.route)
    setDistance(Math.round(result.distance * 100) / 100)
    setDuration(Math.round(result.duration))
  }

  const handleSearch = async (query: string, type: "pickup" | "dropoff") => {
    if (type === "pickup") {
      setPickupSearch(query)
      if (query.length > 2) {
        const results = await searchAddress(query)
        setPickupResults(results)
      } else {
        setPickupResults([])
      }
    } else {
      setDropoffSearch(query)
      if (query.length > 2) {
        const results = await searchAddress(query)
        setDropoffResults(results)
      } else {
        setDropoffResults([])
      }
    }
  }

  const handleSelectResult = (result: SearchResult, type: "pickup" | "dropoff") => {
    const location = { lat: result.lat, lng: result.lng }
    if (type === "pickup") {
      setPickup({ location, address: result.display_name })
      setPickupSearch(result.display_name)
      setPickupResults([])
    } else {
      setDropoff({ location, address: result.display_name })
      setDropoffSearch(result.display_name)
      setDropoffResults([])
    }
  }

  const handleMapClick = (location: LatLng, address: string) => {
    if (selectingType === "pickup") {
      setPickup({ location, address })
      setPickupSearch(address)
    } else if (selectingType === "dropoff") {
      setDropoff({ location, address })
      setDropoffSearch(address)
    }
    setSelectingType(null)
  }

  const handleBookRide = async () => {
    if (!pickup || !dropoff) return

    setIsBooking(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from("rides").insert({
        user_id: userId,
        pickup_lat: pickup.location.lat,
        pickup_lng: pickup.location.lng,
        pickup_address: pickup.address,
        dropoff_lat: dropoff.location.lat,
        dropoff_lng: dropoff.location.lng,
        dropoff_address: dropoff.address,
        distance_km: distance,
        estimated_duration_min: duration,
        fare,
        payment_method: paymentMethod,
        status: "pending",
      })

      if (error) throw error

      setBookingSuccess(true)
      setTimeout(() => {
        setPickup(null)
        setDropoff(null)
        setPickupSearch("")
        setDropoffSearch("")
        setRoute([])
        setDistance(0)
        setDuration(0)
        setFare(0)
        setBookingSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error booking ride:", error)
    } finally {
      setIsBooking(false)
    }
  }

  const markers = [
    ...(pickup ? [{ position: pickup.location, type: "pickup" as const, label: "Pickup" }] : []),
    ...(dropoff ? [{ position: dropoff.location, type: "dropoff" as const, label: "Dropoff" }] : []),
  ]

  if (bookingSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-md">
        <Card className="border-accent/50 shadow-lg shadow-accent/10">
          <CardContent className="py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/20"
            >
              <Navigation className="h-10 w-10 text-accent" />
            </motion.div>
            <h3 className="text-2xl font-bold">Ride Booked!</h3>
            <p className="mt-2 text-muted-foreground">Looking for nearby drivers...</p>
            <div className="mt-4 flex justify-center">
              <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "linear" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Booking Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card className="shadow-lg shadow-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Route className="h-4 w-4 text-primary" />
              </div>
              Book a Ride
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Pickup Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pickup Location</Label>
              <div className="relative">
                <div className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent/20">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
                <Input
                  placeholder="Enter pickup address"
                  value={pickupSearch}
                  onChange={(e) => handleSearch(e.target.value, "pickup")}
                  onFocus={() => setSelectingType("pickup")}
                  className="h-11 pl-11"
                />
                <AnimatePresence>
                  {pickupResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg"
                    >
                      {pickupResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                          onClick={() => handleSelectResult(result, "pickup")}
                        >
                          {result.display_name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectingType("pickup")}
                className={selectingType === "pickup" ? "border-accent text-accent" : ""}
              >
                <MapPin className="mr-2 h-3 w-3" />
                {selectingType === "pickup" ? "Click on map..." : "Select on map"}
              </Button>
            </div>

            {/* Dropoff Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dropoff Location</Label>
              <div className="relative">
                <div className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                </div>
                <Input
                  placeholder="Enter destination address"
                  value={dropoffSearch}
                  onChange={(e) => handleSearch(e.target.value, "dropoff")}
                  onFocus={() => setSelectingType("dropoff")}
                  className="h-11 pl-11"
                />
                <AnimatePresence>
                  {dropoffResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg"
                    >
                      {dropoffResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                          onClick={() => handleSelectResult(result, "dropoff")}
                        >
                          {result.display_name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectingType("dropoff")}
                className={selectingType === "dropoff" ? "border-destructive text-destructive" : ""}
              >
                <MapPin className="mr-2 h-3 w-3" />
                {selectingType === "dropoff" ? "Click on map..." : "Select on map"}
              </Button>
            </div>

            {/* Trip Details */}
            <AnimatePresence>
              {pickup && dropoff && distance > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Route className="h-3 w-3" />
                          <span className="text-xs">Distance</span>
                        </div>
                        <p className="text-lg font-bold">{distance} km</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Duration</span>
                        </div>
                        <p className="text-lg font-bold">{duration} min</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          <span className="text-xs">Fare</span>
                        </div>
                        <p className="text-lg font-bold text-primary">${fare}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "qr_code")}>
                <label
                  htmlFor="card"
                  className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-4 transition-all ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="card" id="card" />
                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        paymentMethod === "card" ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <CreditCard
                        className={`h-5 w-5 ${paymentMethod === "card" ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-xs text-muted-foreground">Pay securely with your card</p>
                    </div>
                  </div>
                </label>
                <label
                  htmlFor="qr_code"
                  className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-4 transition-all ${
                    paymentMethod === "qr_code" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="qr_code" id="qr_code" />
                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        paymentMethod === "qr_code" ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <QrCode
                        className={`h-5 w-5 ${paymentMethod === "qr_code" ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">QR Code Payment</p>
                      <p className="text-xs text-muted-foreground">Scan and pay with your banking app</p>
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Book Button */}
            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
              disabled={!pickup || !dropoff || isBooking}
              onClick={handleBookRide}
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-5 w-5" />
                  Book Ride {fare > 0 && `- $${fare}`}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="overflow-hidden shadow-lg shadow-primary/5">
          <CardContent className="h-[600px] p-0">
            <MapComponent
              markers={markers}
              route={route}
              onLocationSelect={handleMapClick}
              showUserLocation
              interactive
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
