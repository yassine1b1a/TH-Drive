'use client'

import dynamic from 'next/dynamic'
import type { LatLng } from '@/lib/types'

// Dynamically import the appropriate map based on props
const MapComponent = dynamic(() => import('@/components/map/map-component'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
})

interface UnifiedMapProps {
  // Common props
  variant?: 'booking' | 'driver' | 'simple'
  pickupLocation?: { lat: number; lng: number }
  dropoffLocation?: { lat: number; lng: number }
  markers?: Array<{
    position: LatLng
    type: "pickup" | "dropoff" | "driver"
    label?: string
  }>
  route?: LatLng[]
  showUserLocation?: boolean
  interactive?: boolean
  showAvailableDrivers?: boolean
  onRouteCalculated?: (route: any) => void
  onDriverSelected?: (driver: any) => void
  onLocationSelect?: (location: LatLng, address: string) => void
  className?: string
  height?: string
}

export default function UnifiedMap({
  variant = 'booking',
  pickupLocation,
  dropoffLocation,
  markers = [],
  route = [],
  showUserLocation = true,
  interactive = true,
  showAvailableDrivers = false,
  onRouteCalculated,
  onDriverSelected,
  onLocationSelect,
  className = '',
  height = '500px'
}: UnifiedMapProps) {
  
  if (variant === 'driver') {
    return (
      <div className={`w-full ${className}`} style={{ height }}>
        <MapComponent
          variant="driver"
          markers={markers}
          route={route}
          showUserLocation={showUserLocation}
          interactive={interactive}
          showAvailableDrivers={showAvailableDrivers}
          onRouteCalculated={onRouteCalculated}
          onLocationSelect={onLocationSelect}
        />
      </div>
    )
  }
  
  // Default to booking variant
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <MapComponent
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        onRouteCalculated={onRouteCalculated}
        showAvailableDrivers={showAvailableDrivers}
        onDriverSelected={onDriverSelected}
      />
    </div>
  )
}

// Export helper functions
export { searchAddress, getRoute } from './map-component'