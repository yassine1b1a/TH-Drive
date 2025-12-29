'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'
import { createClient } from '@/lib/supabase/client'

// Fix for default markers in Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
    iconUrl: '/leaflet/images/marker-icon.png',
    shadowUrl: '/leaflet/images/marker-shadow.png',
  })
}

interface OpenStreetMapProps {
  pickupLocation?: { lat: number; lng: number }
  dropoffLocation?: { lat: number; lng: number }
  onRouteCalculated?: (route: any) => void
  showAvailableDrivers?: boolean
  onDriverSelected?: (driver: any) => void
}

export default function OpenStreetMap({
  pickupLocation,
  dropoffLocation,
  onRouteCalculated,
  showAvailableDrivers = true,
  onDriverSelected,
}: OpenStreetMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const routingControlRef = useRef<L.Routing.Control | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Safe logging function
  const safeLog = {
    error: (message: string, error?: any) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error(message, error)
      }
    },
    log: (message: string, data?: any) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(message, data)
      }
    }
  }

  // Initialize map
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) {
      return
    }

    try {
      // Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2)

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            mapRef.current?.setView([latitude, longitude], 13)
            
            // Add user location marker
            L.marker([latitude, longitude])
              .addTo(mapRef.current!)
              .bindPopup('Your location')
              .openPopup()
          },
          (error) => {
            setLocationError('Unable to get your location. Please select manually on map.')
            // Default to a central location
            mapRef.current?.setView([20, 0], 2)
          }
        )
      } else {
        setLocationError('Geolocation not supported. Please select location on map.')
        mapRef.current?.setView([20, 0], 2)
      }

      setIsLoading(false)

    } catch (error) {
      safeLog.error('Error initializing map:', error)
      setIsLoading(false)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Fetch available drivers
  useEffect(() => {
    if (!showAvailableDrivers || !mapRef.current) return

    const fetchAvailableDrivers = async () => {
      try {
        const supabase = createClient()
        
        // Get available drivers (online and not busy)
        const { data: drivers, error } = await supabase
          .from('driver_details')
          .select(`
            *,
            profiles!inner (
              id,
              full_name,
              rating,
              total_rides
            )
          `)
          .eq('is_online', true)
          .eq('is_verified', true)

        if (error) {
          safeLog.error('Error fetching drivers:', error)
          return
        }

        setAvailableDrivers(drivers || [])

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        // Add driver markers
        drivers?.forEach((driver: any) => {
          if (driver.current_lat && driver.current_lng) {
            const driverIcon = L.divIcon({
              html: `
                <div class="relative">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg">
                    D
                  </div>
                  <div class="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              `,
              className: 'driver-marker',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })

            const marker = L.marker([driver.current_lat, driver.current_lng], { icon: driverIcon })
              .addTo(mapRef.current!)
              .bindPopup(`
                <div class="p-2">
                  <strong>${driver.profiles.full_name || 'Driver'}</strong><br/>
                  Rating: ${driver.profiles.rating || '5.0'}/5.0<br/>
                  Rides: ${driver.profiles.total_rides || 0}<br/>
                  Vehicle: ${driver.vehicle_make} ${driver.vehicle_model}<br/>
                  <button 
                    class="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 select-driver-btn"
                    data-driver-id="${driver.user_id}"
                  >
                    Select Driver
                  </button>
                </div>
              `)

            markersRef.current.push(marker)
          }
        })

      } catch (error) {
        safeLog.error('Error in driver fetch:', error)
      }
    }

    fetchAvailableDrivers()
    const interval = setInterval(fetchAvailableDrivers, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [showAvailableDrivers])

  // Handle route calculation
  useEffect(() => {
    if (!mapRef.current || !pickupLocation || !dropoffLocation) return

    try {
      // Clear existing route
      if (routingControlRef.current) {
        mapRef.current.removeControl(routingControlRef.current)
        routingControlRef.current = null
      }

      // Calculate route using OSRM
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(pickupLocation.lat, pickupLocation.lng),
          L.latLng(dropoffLocation.lat, dropoffLocation.lng),
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 5 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        createMarker: (i: number, waypoint: any, n: number) => {
          const icon = L.divIcon({
            html: i === 0 
              ? `<div class="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>`
              : `<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>`,
            className: 'waypoint-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
          return L.marker(waypoint.latLng, { icon })
        },
        router: new (L.Routing as any).OSRMv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
        }),
      }).addTo(mapRef.current)

      routingControlRef.current = routingControl

      // Listen for route calculation
      routingControl.on('routesfound', function(e: any) {
        const routes = e.routes
        if (routes && routes.length > 0) {
          const route = routes[0]
          if (onRouteCalculated) {
            onRouteCalculated({
              distance: route.summary.totalDistance / 1000, // Convert to km
              duration: route.summary.totalTime / 60, // Convert to minutes
              coordinates: route.coordinates,
              instructions: route.instructions,
            })
          }
        }
      })

      routingControl.on('routingerror', function(e: any) {
        safeLog.error('Routing error:', e.error)
      })

    } catch (error) {
      safeLog.error('Error setting up routing:', error)
    }

  }, [pickupLocation, dropoffLocation, onRouteCalculated])

  // Add to the component
  const handleDriverClick = (driverId: string) => {
    const driver = availableDrivers.find(d => d.user_id === driverId)
    if (driver && onDriverSelected) {
      onDriverSelected(driver)
    }
  }

  // Update the event listener
  useEffect(() => {
    if (!mapRef.current || !onDriverSelected) return

    const handleMapClick = (e: any) => {
      if (e.target.classList.contains('select-driver-btn')) {
        const driverId = e.target.dataset.driverId
        handleDriverClick(driverId)
      }
    }

    mapRef.current.getContainer().addEventListener('click', handleMapClick)

    return () => {
      mapRef.current?.getContainer().removeEventListener('click', handleMapClick)
    }
  }, [availableDrivers, onDriverSelected])// Handle driver selection
  useEffect(() => {
    if (!mapRef.current || !onDriverSelected) return

    const handleDriverSelect = (e: any) => {
      if (e.target.classList.contains('select-driver-btn')) {
        const driverId = e.target.getAttribute('data-driver-id')
        const driver = availableDrivers.find(d => d.user_id === driverId)
        if (driver && onDriverSelected) {
          onDriverSelected(driver)
        }
      }
    }

    mapRef.current?.getContainer().addEventListener('click', handleDriverSelect)

    return () => {
      mapRef.current?.getContainer().removeEventListener('click', handleDriverSelect)
    }
  }, [availableDrivers, onDriverSelected])

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px' }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {locationError && (
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{locationError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
        }
        .driver-marker {
          background: transparent;
          border: none;
        }
        .waypoint-marker {
          background: transparent;
          border: none;
        }
        .leaflet-routing-container {
          display: none;
        }
      `}</style>
    </div>
  )
}