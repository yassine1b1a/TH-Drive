'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Loader2, 
  MapPin, 
  Navigation, 
  Clock, 
  Car, 
  DollarSign,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Star,
  Calendar,
  CreditCard,
  User,
  Sparkles,
  Compass
} from 'lucide-react'
import { calculateFare, estimateArrivalTime, findNearestDriver } from '@/lib/ride/calculations'
import dynamic from 'next/dynamic'

// Dynamically import the map component with SSR disabled
const UnifiedMap = dynamic(() => import('@/components/map/UnifiedMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
})

interface Location {
  lat: number
  lng: number
  address?: string
}

interface RouteInfo {
  distance: number // km
  duration: number // minutes
  coordinates: [number, number][]
  instructions: any[]
}

interface Driver {
  user_id: string
  current_lat: number | null
  current_lng: number | null
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  vehicle_plate: string
  is_online: boolean
  is_verified: boolean
  distance?: number
  profiles: {
    full_name: string | null
    rating: number | null
    total_rides: number | null
    avatar_url?: string | null
  }
}

// Haversine formula to calculate distance between two points in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function BookRidePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [userLocation, setUserLocation] = useState<Location | null>(null)
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([])
  const [rideType, setRideType] = useState<'standard' | 'premium' | 'group'>('standard')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr' | 'cash'>('card')
  const [fareEstimate, setFareEstimate] = useState<number | null>(null)
  const [eta, setEta] = useState<number | null>(null)
  const [nearestDriver, setNearestDriver] = useState<Driver | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [searchingPickup, setSearchingPickup] = useState(false)
  const [searchingDropoff, setSearchingDropoff] = useState(false)
  const [showDriverList, setShowDriverList] = useState(false)
  const [searchRadius, setSearchRadius] = useState<number>(10) // Default 10km radius
  const [locationPermission, setLocationPermission] = useState<boolean>(true)
  const [isClient, setIsClient] = useState(false)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get user's current location - only runs on client side
  useEffect(() => {
    if (!isClient) return

    const getUserLocation = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            
            // Try to get address from coordinates
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              )
              const data = await response.json()
              
              const location: Location = {
                lat: latitude,
                lng: longitude,
                address: data.display_name || 'Current location'
              }
              
              setUserLocation(location)
              setPickupLocation(location)
              setPickupAddress(data.display_name || 'Current location')
              setLocationPermission(true)
            } catch (error) {
              // If address lookup fails, still set coordinates
              const location: Location = { lat: latitude, lng: longitude }
              setUserLocation(location)
              setPickupLocation(location)
              setLocationPermission(true)
            }
          },
          (error) => {
            console.error('Error getting location:', error)
            setLocationPermission(false)
            // Default to a central location if geolocation fails
            const defaultLocation: Location = {
              lat: 40.7128,
              lng: -74.0060,
              address: 'New York, NY'
            }
            setUserLocation(defaultLocation)
            setPickupLocation(defaultLocation)
            setPickupAddress('New York, NY')
          }
        )
      } else {
        setLocationPermission(false)
        // Fallback if geolocation not supported
        const defaultLocation: Location = {
          lat: 40.7128,
          lng: -74.0060,
          address: 'New York, NY'
        }
        setUserLocation(defaultLocation)
        setPickupLocation(defaultLocation)
        setPickupAddress('New York, NY')
      }
    }

    getUserLocation()
  }, [isClient])

  // Fetch available drivers - only runs on client side
  useEffect(() => {
    if (!isClient) return

    const fetchAvailableDrivers = async () => {
      try {
        const supabase = createClient()
        
        const { data: driversData, error } = await supabase
          .from('driver_details')
          .select(`
            user_id,
            current_lat,
            current_lng,
            vehicle_make,
            vehicle_model,
            vehicle_color,
            vehicle_plate,
            is_online,
            is_verified,
            profiles!inner (
              full_name,
              rating,
              total_rides,
              avatar_url
            )
          `)
          .eq('is_online', true)
          .eq('is_verified', true)
          .not('current_lat', 'is', null)
          .not('current_lng', 'is', null)

        if (error) throw error

        // Transform the data to match our interface
        const drivers: Driver[] = (driversData || []).map((driver: any) => ({
          user_id: driver.user_id,
          current_lat: driver.current_lat,
          current_lng: driver.current_lng,
          vehicle_make: driver.vehicle_make || '',
          vehicle_model: driver.vehicle_model || '',
          vehicle_color: driver.vehicle_color || '',
          vehicle_plate: driver.vehicle_plate || '',
          is_online: driver.is_online || false,
          is_verified: driver.is_verified || false,
          profiles: (Array.isArray(driver.profiles) ? driver.profiles[0] : driver.profiles) || {
            full_name: null,
            rating: null,
            total_rides: null,
            avatar_url: null
          }
        }))

        // Filter drivers by distance if we have pickup location
        let filteredDrivers = drivers
        if (pickupLocation) {
          // Add distance to each driver
          const driversWithDistance = drivers.map(driver => {
            const distance = driver.current_lat && driver.current_lng 
              ? calculateDistance(
                  pickupLocation.lat,
                  pickupLocation.lng,
                  driver.current_lat,
                  driver.current_lng
                )
              : Infinity
            
            return { ...driver, distance }
          })
          
          // Filter by search radius and sort by distance (closest first)
          filteredDrivers = driversWithDistance
            .filter(driver => driver.distance <= searchRadius)
            .sort((a, b) => a.distance - b.distance)
          
          console.log(`Found ${filteredDrivers.length} drivers within ${searchRadius}km`)
        }

        setAvailableDrivers(filteredDrivers)

        // Filter drivers with valid coordinates for nearest driver calculation
        const driversWithCoords = filteredDrivers.filter(
          driver => driver.current_lat !== null && driver.current_lng !== null
        ) as Driver[]

        // If we have pickup location, find nearest driver
        if (pickupLocation && driversWithCoords.length > 0) {
          const nearest = findNearestDriver(driversWithCoords, pickupLocation)
          setNearestDriver(nearest)
          setSelectedDriver(nearest)
        }

      } catch (error) {
        console.error('Error fetching drivers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableDrivers()
    const interval = setInterval(fetchAvailableDrivers, 30000)

    return () => clearInterval(interval)
  }, [pickupLocation, searchRadius, isClient])

  // Calculate fare and ETA when route changes
  useEffect(() => {
    if (routeInfo && pickupLocation && availableDrivers.length > 0) {
      // Calculate fare
      const fare = calculateFare(routeInfo.distance, routeInfo.duration, rideType)
      setFareEstimate(fare)
      
      // Calculate ETA (route time + driver arrival time)
      let driverArrivalTime = 10 // Default 10 minutes if no driver
      if (selectedDriver && selectedDriver.current_lat && selectedDriver.current_lng) {
        driverArrivalTime = estimateArrivalTime(selectedDriver, pickupLocation)
      } else if (nearestDriver && nearestDriver.current_lat && nearestDriver.current_lng) {
        driverArrivalTime = estimateArrivalTime(nearestDriver, pickupLocation)
      }
      
      const totalEta = Math.ceil(routeInfo.duration + driverArrivalTime)
      setEta(totalEta)
    }
  }, [routeInfo, rideType, selectedDriver, nearestDriver, pickupLocation, availableDrivers])

  // Handle address search
  const searchAddress = async (query: string, isPickup: boolean) => {
    if (!query.trim()) return

    const setSearching = isPickup ? setSearchingPickup : setSearchingDropoff
    setSearching(true)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        const location: Location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name
        }

        if (isPickup) {
          setPickupLocation(location)
          setPickupAddress(result.display_name)
        } else {
          setDropoffLocation(location)
          setDropoffAddress(result.display_name)
        }
      }
    } catch (error) {
      console.error('Error searching address:', error)
    } finally {
      setSearching(false)
    }
  }

  // Handle route calculation from map
  const handleRouteCalculated = useCallback((route: any) => {
    if (route) {
      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        coordinates: route.coordinates || [],
        instructions: route.instructions || []
      })
    }
  }, [])

  // Handle driver selection from map or list
  const handleDriverSelect = useCallback((driver: Driver) => {
    console.log('Driver selected:', driver.profiles.full_name)
    setSelectedDriver(driver)
    setShowDriverList(false)
  }, [])

  // Validate booking - FIXED: No window usage
  const validateBooking = () => {
    const newErrors: string[] = []

    if (!pickupLocation) {
      newErrors.push('Please select a pickup location')
    }

    if (!dropoffLocation) {
      newErrors.push('Please select a dropoff location')
    }

    if (!selectedDriver) {
      newErrors.push('Please select a driver')
    }

    if (!routeInfo) {
      newErrors.push('Please calculate a route first')
    }

    if (!fareEstimate) {
      newErrors.push('Fare estimate not calculated')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // Handle ride booking - FIXED VERSION
  const handleBookRide = async () => {
    if (!validateBooking() || !pickupLocation || !dropoffLocation || !selectedDriver || !routeInfo || !fareEstimate) {
      return
    }

    setBooking(true)
    setErrors([])

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Authentication error. Please log in again.')
      }
      
      if (!user) {
        throw new Error('Not authenticated. Please log in to book a ride.')
      }

      console.log('User ID:', user.id)
      console.log('Selected driver ID:', selectedDriver.user_id)

      // Prepare ride data with correct types and enum values
      const rideData = {
        user_id: user.id,
        driver_id: selectedDriver.user_id,
        status: 'pending',
        pickup_lat: parseFloat(pickupLocation.lat.toFixed(6)),
        pickup_lng: parseFloat(pickupLocation.lng.toFixed(6)),
        pickup_address: pickupAddress || null,
        dropoff_lat: parseFloat(dropoffLocation.lat.toFixed(6)),
        dropoff_lng: parseFloat(dropoffLocation.lng.toFixed(6)),
        dropoff_address: dropoffAddress || null,
        distance_km: parseFloat(routeInfo.distance.toFixed(2)),
        estimated_duration_min: Math.ceil(routeInfo.duration),
        fare: parseFloat(fareEstimate.toFixed(2)),
        payment_method: paymentMethod === 'qr' ? 'qr_code' : paymentMethod, // Match enum from schema
        payment_status: 'pending',
        ride_type: rideType,
      }

      console.log('Booking ride with data:', rideData)

      // Create ride request
      const { data: ride, error } = await supabase
        .from('rides')
        .insert([rideData]) // Wrap in array
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // Check for specific constraints
        if (error.message.includes('violates check constraint')) {
          throw new Error('Invalid data provided. Please check your ride details.')
        } else if (error.message.includes('foreign key constraint')) {
          throw new Error('Invalid user or driver ID.')
        } else {
          throw new Error(`Booking failed: ${error.message}`)
        }
      }

      console.log('Ride booked successfully:', ride)

      // Redirect to ride tracking page
      router.push(`/ride/${ride.id}`)

    } catch (error: any) {
      console.error('Error booking ride:', error)
      setErrors([error.message || 'Failed to book ride. Please try again.'])
      
      // Show alert for authentication issues
      if (error.message.includes('Not authenticated') || error.message.includes('Authentication')) {
        alert('Please log in to book a ride. Redirecting to login...')
        router.push('/login')
      }
    } finally {
      setBooking(false)
    }
  }

  // Ride type options
  const rideTypes = [
    { id: 'standard', name: 'Standard', icon: Car, description: 'Everyday ride', multiplier: 1 },
    { id: 'premium', name: 'Premium', icon: Sparkles, description: 'Luxury vehicles', multiplier: 1.5 },
    { id: 'group', name: 'Group', icon: Users, description: 'Up to 6 people', multiplier: 1.8 },
  ]

  // Payment methods - updated to match schema
  const paymentMethods = [
    { id: 'card', name: 'Card', icon: CreditCard },
    { id: 'qr', name: 'QR Code', icon: CreditCard },
    { id: 'cash', name: 'Cash', icon: DollarSign },
  ]

  // Search radius options
  const radiusOptions = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 15, label: '15 km' },
    { value: 20, label: '20 km' },
  ]

  // Helper function to get driver initials
  const getDriverInitials = (driver: Driver) => {
    const name = driver.profiles.full_name || 'Driver'
    return name.charAt(0).toUpperCase()
  }

  // Helper function to get driver rating
  const getDriverRating = (driver: Driver) => {
    return (driver.profiles.rating || 5.0).toFixed(1)
  }

  // Helper function to get driver ride count
  const getDriverRideCount = (driver: Driver) => {
    return driver.profiles.total_rides || 0
  }

  // Helper function to check if driver has valid coordinates
  const hasValidCoordinates = (driver: Driver | null) => {
    return driver && driver.current_lat !== null && driver.current_lng !== null
  }

  // Helper function to get driver distance
  const getDriverDistance = (driver: Driver) => {
    if (!driver.distance || !pickupLocation) return 'N/A'
    return driver.distance.toFixed(1)
  }

  // Request location permission - FIXED: Check for window
  const requestLocationPermission = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current location'
          }
          setUserLocation(location)
          setPickupLocation(location)
          setPickupAddress('Current location')
          setLocationPermission(true)
        },
        (error) => {
          console.error('Location permission denied:', error)
          setLocationPermission(false)
          alert('Location permission is required to use your current location.')
        }
      )
    } else {
      setLocationPermission(false)
      alert('Geolocation is not supported by your browser.')
    }
  }

  // Handle pickup address blur - FIXED: Check for isClient
  const handlePickupBlur = () => {
    if (!isClient || !pickupAddress.trim()) return
    searchAddress(pickupAddress, true)
  }

  // Handle dropoff address blur - FIXED: Check for isClient
  const handleDropoffBlur = () => {
    if (!isClient || !dropoffAddress.trim()) return
    searchAddress(dropoffAddress, false)
  }

  if (loading && !isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading ride booking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Book a Ride</h1>
              <p className="text-muted-foreground">
                Get where you need to go quickly and safely
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Booking Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Where to?</CardTitle>
                <CardDescription>Enter your pickup and dropoff locations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pickup Location */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <Label htmlFor="pickup">Pickup Location</Label>
                    {!locationPermission && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Location disabled
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="pickup"
                      placeholder="Enter pickup address or click on map"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      onBlur={handlePickupBlur}
                      disabled={searchingPickup}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => searchAddress(pickupAddress, true)}
                      disabled={searchingPickup || !pickupAddress}
                    >
                      {searchingPickup ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (userLocation) {
                          setPickupLocation(userLocation)
                          setPickupAddress(userLocation.address || 'Current location')
                        } else {
                          requestLocationPermission()
                        }
                      }}
                      title="Use current location"
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Dropoff Location */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <Label htmlFor="dropoff">Dropoff Location</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="dropoff"
                      placeholder="Enter destination address"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      onBlur={handleDropoffBlur}
                      disabled={searchingDropoff}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => searchAddress(dropoffAddress, false)}
                      disabled={searchingDropoff || !dropoffAddress}
                    >
                      {searchingDropoff ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Map View</Label>
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Search radius:</span>
                      <div className="flex gap-1">
                        {radiusOptions.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={searchRadius === option.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchRadius(option.value)}
                            className="h-8 px-3 text-xs"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden border h-[400px] relative">
                    <UnifiedMap
                      variant="booking"
                      pickupLocation={pickupLocation || undefined}
                      dropoffLocation={dropoffLocation || undefined}
                      onRouteCalculated={handleRouteCalculated}
                      showAvailableDrivers={true}
                      onDriverSelected={handleDriverSelect}
                      className="h-full"
                    />
                    {!locationPermission && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-sm mx-4">
                          <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-semibold mb-2">Location Required</h3>
                          <p className="text-muted-foreground mb-4">
                            Enable location services to see drivers on the map and calculate distances.
                          </p>
                          <Button onClick={requestLocationPermission}>
                            Enable Location
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver Selection */}
                {availableDrivers.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Available Drivers ({availableDrivers.length})</h3>
                        <p className="text-sm text-muted-foreground">
                          Showing drivers within {searchRadius}km • Click on map or select below
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDriverList(!showDriverList)}
                      >
                        {showDriverList ? 'Hide List' : 'Show List'}
                      </Button>
                    </div>

                    {showDriverList && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2">
                        {availableDrivers.map((driver) => (
                          <button
                            key={driver.user_id}
                            type="button"
                            onClick={() => handleDriverSelect(driver)}
                            className={`p-3 rounded-lg border transition-all text-left ${
                              selectedDriver?.user_id === driver.user_id
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                  {getDriverInitials(driver)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium truncate">{driver.profiles.full_name || 'Driver'}</p>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                                    <span className="text-xs">{getDriverRating(driver)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {driver.vehicle_make} {driver.vehicle_model} • {driver.vehicle_color}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDriverDistance(driver)} km
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {getDriverRideCount(driver)} rides • ETA: {estimateArrivalTime(driver, pickupLocation!)} min
                                </p>
                              </div>
                              {selectedDriver?.user_id === driver.user_id && (
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedDriver && (
                      <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                              {getDriverInitials(selectedDriver)}
                            </div>
                            <div>
                              <p className="font-semibold">{selectedDriver.profiles.full_name || 'Driver'}</p>
                              <div className="flex items-center gap-2">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm">{getDriverRating(selectedDriver)}</span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {getDriverRideCount(selectedDriver)} rides
                                </span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getDriverDistance(selectedDriver)} km away
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {selectedDriver.vehicle_make} {selectedDriver.vehicle_model} • {selectedDriver.vehicle_color}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            {selectedDriver.vehicle_plate}
                          </Badge>
                        </div>
                        {pickupLocation && hasValidCoordinates(selectedDriver) && (
                          <div className="mt-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>Estimated arrival: {estimateArrivalTime(selectedDriver, pickupLocation)} min</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ride Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Ride</CardTitle>
                <CardDescription>Select the type of vehicle you need</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rideTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setRideType(type.id as any)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          rideType === type.id
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            rideType === type.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">{type.name}</p>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {type.multiplier === 1 ? 'Standard rate' : `${type.multiplier}x standard rate`}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Ride Summary & Booking */}
          <div className="space-y-6">
            {/* Ride Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Ride Summary</CardTitle>
                <CardDescription>Your trip details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {routeInfo ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Distance</span>
                        <span className="font-medium">{routeInfo.distance.toFixed(1)} km</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Time</span>
                        <span className="font-medium">{Math.ceil(routeInfo.duration)} min</span>
                      </div>
                      {eta && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total ETA</span>
                          <span className="font-medium">{eta} min</span>
                        </div>
                      )}
                      {fareEstimate && (
                        <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                          <span>Estimated Fare</span>
                          <span>${fareEstimate.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Selected Driver */}
                    {selectedDriver ? (
                      <div className="space-y-3">
                        <h3 className="font-semibold">Selected Driver</h3>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                              {getDriverInitials(selectedDriver)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{selectedDriver.profiles.full_name || 'Driver'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm">{getDriverRating(selectedDriver)}</span>
                              <span className="text-sm text-muted-foreground">
                                ({getDriverRideCount(selectedDriver)} rides)
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-muted-foreground truncate">
                                {selectedDriver.vehicle_make} {selectedDriver.vehicle_model}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {getDriverDistance(selectedDriver)} km away
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : availableDrivers.length > 0 ? (
                      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Please select a driver from the map or list</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Available Drivers Count */}
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Available Drivers</span>
                        <p className="text-xs text-muted-foreground">Within {searchRadius}km radius</p>
                      </div>
                      <Badge variant={availableDrivers.length > 0 ? "default" : "secondary"}>
                        {availableDrivers.length}
                      </Badge>
                    </div>

                    {availableDrivers.length === 0 && (
                      <div className="p-3 rounded-lg bg-muted">
                        <div className="text-center">
                          <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No drivers available within {searchRadius}km</p>
                          <p className="text-xs text-muted-foreground">Try increasing search radius or adjusting location</p>
                          <div className="flex gap-2 justify-center mt-2">
                            {radiusOptions.map((option) => (
                              <Button
                                key={option.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchRadius(option.value)}
                                className="h-8 px-3 text-xs"
                              >
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">
                      Select pickup and dropoff locations to see ride details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          paymentMethod === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <Icon className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm">{method.name}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Safety Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Safety Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Driver verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Real-time tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Emergency button</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Ride sharing with trusted contacts</span>
                </div>
              </CardContent>
            </Card>

            {/* Book Ride Button */}
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              onClick={handleBookRide}
              disabled={booking || !pickupLocation || !dropoffLocation || !selectedDriver || !routeInfo}
            >
              {booking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Car className="mr-2 h-5 w-5" />
                  {selectedDriver ? `Book with ${(selectedDriver.profiles.full_name || 'Driver').split(' ')[0]}` : 'Book Ride'}
                </>
              )}
            </Button>

            {(!pickupLocation || !dropoffLocation) && (
              <p className="text-center text-sm text-muted-foreground">
                Select pickup and dropoff locations to book a ride
              </p>
            )}
            {(!selectedDriver && availableDrivers.length > 0) && (
              <p className="text-center text-sm text-muted-foreground">
                Please select a driver to continue
              </p>
            )}
            {availableDrivers.length === 0 && pickupLocation && dropoffLocation && (
              <div className="text-center text-sm text-muted-foreground">
                <p>No drivers available within {searchRadius}km.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setSearchRadius(searchRadius + 5)}
                >
                  Increase search radius
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
