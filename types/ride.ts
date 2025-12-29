export interface Location {
  lat: number
  lng: number
  address?: string
}

export interface Driver {
  user_id: string
  current_lat: number | null
  current_lng: number | null
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  vehicle_plate: string
  is_online: boolean
  is_verified: boolean
  profiles: {
    full_name: string | null
    rating: number | null
    total_rides: number | null
  }
}

export interface RouteInfo {
  distance: number // km
  duration: number // minutes
  coordinates: [number, number][]
  instructions: any[]
}

export interface RideRequest {
  id?: string
  user_id: string
  driver_id: string | null
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  pickup_lat: number
  pickup_lng: number
  pickup_address: string | null
  dropoff_lat: number
  dropoff_lng: number
  dropoff_address: string | null
  distance_km: number | null
  estimated_duration_min: number | null
  fare: number | null
  payment_method: 'card' | 'qr' | 'cash' | null
  payment_status: 'pending' | 'completed' | 'failed'
  ride_type: 'standard' | 'premium' | 'group'
  created_at?: string
  started_at?: string | null
  completed_at?: string | null
}