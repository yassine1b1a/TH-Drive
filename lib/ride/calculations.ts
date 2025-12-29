import { Location, Driver } from '@/types/ride'

// Haversine formula to calculate distance between two coordinates in kilometers
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

// Calculate fare based on distance, time, and ride type
export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  rideType: 'standard' | 'premium' | 'group'
): number {
  // Base rates
  const baseFare = 2.5
  const perKmRate = 1.5
  const perMinuteRate = 0.25
  
  // Calculate base fare
  let fare = baseFare + (distanceKm * perKmRate) + (durationMinutes * perMinuteRate)
  
  // Apply ride type multiplier
  const multipliers = {
    standard: 1.0,
    premium: 1.5,
    group: 1.8
  }
  
  fare *= multipliers[rideType]
  
  // Minimum fare
  const minFare = rideType === 'standard' ? 5 : rideType === 'premium' ? 10 : 15
  fare = Math.max(fare, minFare)
  
  // Round to 2 decimal places
  return Math.round(fare * 100) / 100
}

// Estimate arrival time for a driver to reach pickup location
export function estimateArrivalTime(driver: Driver, pickupLocation: Location): number {
  if (!driver.current_lat || !driver.current_lng) return 10 // Default 10 minutes
  
  // Calculate distance between driver and pickup
  const distance = calculateDistance(
    driver.current_lat,
    driver.current_lng,
    pickupLocation.lat,
    pickupLocation.lng
  )
  
  // Estimate time based on distance (assuming average speed of 30 km/h in city)
  const averageSpeed = 30 // km/h
  const timeHours = distance / averageSpeed
  const timeMinutes = timeHours * 60
  
  // Add buffer for traffic and pickup
  return Math.ceil(timeMinutes + 5) // Minimum 5 minutes buffer
}

// Find the nearest driver to a location
export function findNearestDriver(drivers: Driver[], location: Location): Driver | null {
  if (!drivers.length) return null
  
  let nearestDriver = drivers[0]
  let shortestDistance = Infinity
  
  for (const driver of drivers) {
    if (!driver.current_lat || !driver.current_lng) continue
    
    const distance = calculateDistance(
      location.lat,
      location.lng,
      driver.current_lat,
      driver.current_lng
    )
    
    if (distance < shortestDistance) {
      shortestDistance = distance
      nearestDriver = driver
    }
  }
  
  return nearestDriver
}

// Simulate driver movement (for real-time updates)
export function simulateDriverMovement(
  driver: Driver,
  destination: Location,
  intervalSeconds: number = 1
): { lat: number; lng: number } {
  if (!driver.current_lat || !driver.current_lng) {
    return { lat: destination.lat, lng: destination.lng }
  }
  
  // Calculate direction vector
  const latDiff = destination.lat - driver.current_lat
  const lngDiff = destination.lng - driver.current_lng
  
  // Calculate distance
  const distance = calculateDistance(
    driver.current_lat,
    driver.current_lng,
    destination.lat,
    destination.lng
  )
  
  // If very close, snap to destination
  if (distance < 0.01) { // 10 meters
    return { lat: destination.lat, lng: destination.lng }
  }
  
  // Move 30 km/h = 0.5 km/minute = 0.00833 km/second
  const speedKmPerSecond = 30 / 3600 // 30 km/h in km/s
  const moveDistance = speedKmPerSecond * intervalSeconds
  
  // Calculate new position (linear interpolation)
  const ratio = Math.min(moveDistance / distance, 1)
  const newLat = driver.current_lat + (latDiff * ratio)
  const newLng = driver.current_lng + (lngDiff * ratio)
  
  return { lat: newLat, lng: newLng }
}

// Calculate optimal route using OSRM
export async function calculateOSRMRoute(
  start: Location,
  end: Location
): Promise<{
  distance: number
  duration: number
  coordinates: [number, number][]
} | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    )
    
    const data = await response.json()
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null
    }
    
    const route = data.routes[0]
    
    return {
      distance: route.distance / 1000, // Convert to km
      duration: route.duration / 60, // Convert to minutes
      coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
    }
  } catch (error) {
    console.error('Error calculating OSRM route:', error)
    return null
  }
}

// Calculate ETA considering traffic (simulated)
export function calculateETAWithTraffic(
  baseDuration: number,
  timeOfDay: Date
): number {
  const hour = timeOfDay.getHours()
  
  // Traffic multipliers based on time of day
  let trafficMultiplier = 1.0
  
  if (hour >= 7 && hour <= 9) {
    // Morning rush hour
    trafficMultiplier = 1.3
  } else if (hour >= 16 && hour <= 19) {
    // Evening rush hour
    trafficMultiplier = 1.4
  } else if (hour >= 12 && hour <= 14) {
    // Lunch time
    trafficMultiplier = 1.2
  } else if (hour >= 22 || hour <= 5) {
    // Late night - less traffic
    trafficMultiplier = 0.8
  }
  
  return Math.ceil(baseDuration * trafficMultiplier)
}

// Validate ride request
export function validateRideRequest(
  pickup: Location,
  dropoff: Location,
  driver: Driver | null
): string[] {
  const errors: string[] = []
  
  if (!pickup.lat || !pickup.lng) {
    errors.push('Invalid pickup location')
  }
  
  if (!dropoff.lat || !dropoff.lng) {
    errors.push('Invalid dropoff location')
  }
  
  if (!driver) {
    errors.push('No driver selected')
  }
  
  // Check if pickup and dropoff are too close
  const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
  if (distance < 0.1) { // Less than 100 meters
    errors.push('Pickup and dropoff locations are too close')
  }
  
  // Check if distance is too far (optional limit)
  if (distance > 100) { // More than 100 km
    errors.push('Distance is too far for a single ride')
  }
  
  return errors
}