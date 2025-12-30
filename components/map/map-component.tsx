"use client"

import dynamic from 'next/dynamic'
import type { LatLng } from '@/lib/types'

// Dynamically import either OpenStreetMap or DriverMap based on needs
const OpenStreetMap = dynamic(() => import('./OpenStreetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
})

// Since DriverMap might not exist in the same location, we'll create a fallback
const DriverMap = dynamic(() => import('./driver-map').then(mod => mod.DriverMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
})

interface MapComponentProps {
  markers?: Array<{
    position: LatLng
    type: "pickup" | "dropoff" | "driver"
    label?: string
  }>
  route?: LatLng[]
  showUserLocation?: boolean
  interactive?: boolean
  showAvailableDrivers?: boolean
  onLocationSelect?: (location: LatLng, address: string) => void
  onRouteCalculated?: (route: any) => void
  pickupLocation?: { lat: number; lng: number }
  dropoffLocation?: { lat: number; lng: number }
  onDriverSelected?: (driver: any) => void
  variant?: 'default' | 'driver'
}

// Export the main component
export function MapComponent({
  markers = [],
  route = [],
  showUserLocation = true,
  interactive = true,
  showAvailableDrivers = false,
  onLocationSelect,
  onRouteCalculated,
  pickupLocation,
  dropoffLocation,
  onDriverSelected,
  variant = 'default'
}: MapComponentProps) {
  
  if (variant === 'driver') {
    return (
      <DriverMap
        markers={markers}
        route={route}
        showUserLocation={showUserLocation}
        interactive={interactive}
        showAvailableDrivers={showAvailableDrivers}
        onRouteCalculated={onRouteCalculated}
      />
    )
  }

  return (
    <OpenStreetMap
      pickupLocation={pickupLocation}
      dropoffLocation={dropoffLocation}
      onRouteCalculated={onRouteCalculated}
      showAvailableDrivers={showAvailableDrivers}
      onDriverSelected={onDriverSelected}
    />
  )
}

// Since searchAddress and getRoute are already exported from driver-map
// We'll re-export them here
export { searchAddress, getRoute, calculateDistance } from './driver-map'

// Export the driver map component directly if needed
export { DriverMap as DriverMapComponent }

// Also export as default for easier imports
export default MapComponent