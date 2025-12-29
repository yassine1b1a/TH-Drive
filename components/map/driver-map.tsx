"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"
import "leaflet-routing-machine"
import { createClient } from "@/lib/supabase/client"
import type { LatLng } from "@/lib/types"

// Fix Leaflet marker icons
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/images/marker-icon-2x.png",
    iconUrl: "/leaflet/images/marker-icon.png",
    shadowUrl: "/leaflet/images/marker-shadow.png",
  })
}

interface DriverMapProps {
  center?: LatLng
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
}

export function DriverMap({
  center = { lat: 0, lng: 0 },
  markers = [],
  route = [],
  showUserLocation = true,
  interactive = true,
  showAvailableDrivers = false,
  onRouteCalculated,
}: DriverMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const routingControlRef = useRef<L.Routing.Control | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) return

    try {
      // Initialize map with a default view or provided center
      const initialCenter = center.lat !== 0 && center.lng !== 0 
        ? [center.lat, center.lng] 
        : [20, 0]
      
      mapRef.current = L.map(mapContainerRef.current).setView(initialCenter as [number, number], 13)

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)

      // Get user location if enabled
      if (showUserLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            
            // If no center provided, use user location
            if (center.lat === 0 && center.lng === 0) {
              mapRef.current?.setView([userLocation.lat, userLocation.lng], 13)
            }
            
            // Add user location marker
            const userIcon = L.divIcon({
              html: `
                <div class="relative">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg">
                    You
                  </div>
                  <div class="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              `,
              className: "driver-marker",
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })
            
            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
              .addTo(mapRef.current!)
              .bindPopup("Your current location")
          },
          (error) => {
            console.error("Geolocation error:", error)
            setLocationError("Unable to get your location. Using default view.")
          }
        )
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error initializing map:", error)
      setIsLoading(false)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers
  useEffect(() => {
    if (!mapRef.current || isLoading) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add new markers
    markers.forEach((marker) => {
      let icon: L.DivIcon
      
      switch (marker.type) {
        case "pickup":
          icon = L.divIcon({
            html: `
              <div class="relative">
                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg">
                  P
                </div>
                <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-sm">
                  ${marker.label || "Pickup"}
                </div>
              </div>
            `,
            className: "pickup-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })
          break
        
        case "dropoff":
          icon = L.divIcon({
            html: `
              <div class="relative">
                <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg">
                  D
                </div>
                <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-sm">
                  ${marker.label || "Dropoff"}
                </div>
              </div>
            `,
            className: "dropoff-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })
          break
        
        case "driver":
          icon = L.divIcon({
            html: `
              <div class="relative">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg">
                  D
                </div>
                <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-sm">
                  ${marker.label || "Driver"}
                </div>
              </div>
            `,
            className: "driver-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })
          break
      }

      const leafletMarker = L.marker([marker.position.lat, marker.position.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(marker.label || marker.type)

      markersRef.current.push(leafletMarker)
    })
  }, [markers, isLoading])

  // Update route
  useEffect(() => {
    if (!mapRef.current || !route || route.length === 0) return

    // Clear existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current)
      routingControlRef.current = null
    }

    // If we have more than 2 points, use routing control
    if (route.length >= 2) {
      try {
        const waypoints = route.map((point) => L.latLng(point.lat, point.lng))
        
        const routingControl = L.Routing.control({
          waypoints,
          routeWhileDragging: false,
          showAlternatives: false,
          lineOptions: {
            styles: [{ color: "#3b82f6", weight: 5, opacity: 0.7 }],
            extendToWaypoints: true,
            missingRouteTolerance: 0,
          },
          createMarker: () => null, // Don't create markers, we have our own
          router: new (L.Routing as any).OSRMv1({
            serviceUrl: "https://router.project-osrm.org/route/v1",
            profile: "driving",
          }),
        })

        routingControl.hide()
        routingControlRef.current = routingControl

        // Listen for route calculation
        routingControl.on("routesfound", function (e: any) {
          const routes = e.routes
          if (routes && routes.length > 0 && onRouteCalculated) {
            const calculatedRoute = routes[0]
            onRouteCalculated({
              distance: calculatedRoute.summary.totalDistance / 1000, // km
              duration: calculatedRoute.summary.totalTime / 60, // minutes
              coordinates: calculatedRoute.coordinates,
            })
          }
        })

        routingControlRef.current.addTo(mapRef.current)
      } catch (error) {
        console.error("Routing error:", error)
        
        // Fallback: draw simple polyline
        const latLngs = route.map((point) => L.latLng(point.lat, point.lng))
        routeLayerRef.current = L.polyline(latLngs, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.7,
        }).addTo(mapRef.current)
      }
    } else if (route.length > 0) {
      // Draw simple polyline for custom route
      const latLngs = route.map((point) => L.latLng(point.lat, point.lng))
      routeLayerRef.current = L.polyline(latLngs, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.7,
      }).addTo(mapRef.current)
    }

    return () => {
      if (routingControlRef.current && mapRef.current) {
        mapRef.current.removeControl(routingControlRef.current)
      }
      if (routeLayerRef.current) {
        routeLayerRef.current.remove()
      }
    }
  }, [route, onRouteCalculated])

  // Update center
  useEffect(() => {
    if (!mapRef.current || !center || (center.lat === 0 && center.lng === 0)) return
    
    mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom())
  }, [center])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" style={{ minHeight: "400px" }} />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
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
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
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
        .pickup-marker,
        .dropoff-marker,
        .driver-marker {
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

// Helper function to get route
export async function getRoute(start: LatLng, end: LatLng): Promise<{ route: LatLng[]; distance: number; duration: number }> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    )
    
    const data = await response.json()
    
    if (data.code === "Ok" && data.routes.length > 0) {
      const route = data.routes[0]
      const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
        lng: coord[0],
        lat: coord[1],
      }))
      
      return {
        route: coordinates,
        distance: route.distance / 1000, // Convert to km
        duration: route.duration / 60, // Convert to minutes
      }
    }
  } catch (error) {
    console.error("Error fetching route:", error)
  }
  
  // Fallback: straight line
  return {
    route: [start, end],
    distance: calculateDistance(start, end),
    duration: calculateDistance(start, end) * 2, // Rough estimate: 2 minutes per km
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat)
  const dLon = toRad(point2.lng - point1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}