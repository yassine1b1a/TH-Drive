export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: "user" | "driver" | "admin" | "moderator"
  is_banned: boolean
  ban_reason: string | null
  warnings_count: number
  rating: number
  total_rides: number
  created_at: string
  updated_at: string
}

export interface DriverDetails {
  id: string
  user_id: string
  license_number: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_color: string
  vehicle_plate: string
  is_verified: boolean
  is_online: boolean
  current_lat: number | null
  current_lng: number | null
  created_at: string
  updated_at: string
}

export interface Ride {
  id: string
  user_id: string
  driver_id: string | null
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  pickup_lat: number
  pickup_lng: number
  pickup_address: string | null
  dropoff_lat: number
  dropoff_lng: number
  dropoff_address: string | null
  distance_km: number | null
  estimated_duration_min: number | null
  fare: number | null
  payment_method: "card" | "qr_code" | "cash" | null
  payment_status: "pending" | "completed" | "failed"
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface Rating {
  id: string
  ride_id: string
  rater_id: string
  rated_id: string
  rating: number
  comment: string | null
  is_hidden: boolean
  created_at: string
}

export interface Violation {
  id: string
  user_id: string
  ride_id: string | null
  reported_by: string | null
  violation_type: "late_arrival" | "wrong_location" | "misconduct" | "unsafe_driving" | "cancellation" | "other"
  description: string | null
  status: "pending" | "reviewed" | "warning_issued" | "ban_issued" | "dismissed"
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface ModerationAlert {
  id: string
  user_id: string
  alert_type: "low_rating" | "multiple_violations" | "user_report"
  description: string | null
  status: "pending" | "reviewed" | "actioned"
  reviewed_by: string | null
  action_taken: string | null
  created_at: string
  reviewed_at: string | null
}

export interface SupportMessage {
  id: string
  user_id: string
  message: string
  is_from_user: boolean
  is_ai_response: boolean
  created_at: string
}

export interface LatLng {
  lat: number
  lng: number
}
