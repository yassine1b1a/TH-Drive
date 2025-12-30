"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, User, MessageSquare, ThumbsUp, Clock, Award, TrendingUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Rating {
  id: string
  rating: number
  comment: string | null
  created_at: string
  ride: {
    id: string
    pickup_address: string | null
    dropoff_address: string | null
  } | null
  rater: {
    full_name: string | null
  } | null
}

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number | null
  role: "user" | "driver" | "admin" | "moderator"
  total_rides: number
}

export default function RatingsPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [stats, setStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    fiveStarRatings: 0,
    recentRatings: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setProfile(profileData)

      // Load ratings based on role
      if (profileData?.role === "driver") {
        // For drivers: Get ratings where they were rated (rated_id = driver's id)
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select(`
            id,
            rating,
            comment,
            created_at,
            ride:rides!ratings_ride_id_fkey (
              id,
              pickup_address,
              dropoff_address
            ),
            rater:profiles!ratings_rater_id_fkey (
              full_name
            )
          `)
          .eq("rated_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        setRatings(ratingsData || [])
      } else {
        // For users: Get ratings they gave to drivers
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select(`
            id,
            rating,
            comment,
            created_at,
            ride:rides!ratings_ride_id_fkey (
              id,
              pickup_address,
              dropoff_address
            ),
            rated:profiles!ratings_rated_id_fkey (
              full_name
            )
          `)
          .eq("rater_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        // Transform data to match interface
        const transformedRatings = (ratingsData || []).map(rating => ({
          ...rating,
          rater: null, // User is the rater, not the ratee
        }))
        setRatings(transformedRatings)
      }

      // Calculate stats
      const allRatings = ratingsData || []
      const totalRatings = allRatings.length
      const averageRating = totalRatings > 0 
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0
      const fiveStarRatings = allRatings.filter(r => r.rating === 5).length
      const recentRatings = allRatings.filter(r => {
        const ratingDate = new Date(r.created_at)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return ratingDate > thirtyDaysAgo
      }).length

      setStats({
        totalRatings,
        averageRating,
        fiveStarRatings,
        recentRatings,
      })

      setLoading(false)
    }

    loadData()
  }, [])

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "Unknown time"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please log in</h2>
          <p className="text-muted-foreground">You need to log in to view ratings</p>
        </div>
      </div>
    )
  }

  const isDriver = profile?.role === "driver"

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          full_name: profile?.full_name || "User",
          email: profile?.email || "",
          rating: profile?.rating || 5.0,
        }}
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Ratings</h1>
              <p className="text-muted-foreground">
                {isDriver 
                  ? "View feedback from passengers and manage your driver reputation" 
                  : "View and manage the ratings you've given to drivers"
                }
              </p>
            </div>
            <Badge variant={isDriver ? "default" : "outline"}>
              {isDriver ? "Driver" : "Passenger"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Overall Rating */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                  <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/5</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          {/* Total Ratings */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Ratings</p>
                  <p className="text-2xl font-bold">{stats.totalRatings}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* 5-Star Ratings */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">5-Star Ratings</p>
                  <p className="text-2xl font-bold">{stats.fiveStarRatings}</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Ratings (30 days) */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last 30 Days</p>
                  <p className="text-2xl font-bold">{stats.recentRatings}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reviews */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {isDriver ? "Recent Reviews from Passengers" : "Your Recent Ratings to Drivers"}
            </CardTitle>
            <CardDescription>
              {isDriver 
                ? "Feedback from your recent rides" 
                : "Ratings you've given to drivers recently"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No reviews yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isDriver 
                    ? "Complete rides to receive ratings and reviews from passengers" 
                    : "Rate your completed rides to see them here"
                  }
                </p>
                {!isDriver && (
                  <Button onClick={() => window.location.href = "/ride-history"}>
                    View Ride History
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {ratings.map((rating) => (
                  <div key={rating.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {isDriver 
                              ? rating.rater?.full_name || "Passenger"
                              : `Ride: ${rating.ride?.pickup_address?.split(",")[0] || "Unknown"} → ${rating.ride?.dropoff_address?.split(",")[0] || "Unknown"}`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeAgo(rating.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="ml-2 font-semibold">{rating.rating}.0</span>
                      </div>
                    </div>
                    
                    {rating.comment && (
                      <div className="pl-13">
                        <p className="text-sm text-muted-foreground italic">"{rating.comment}"</p>
                      </div>
                    )}

                    {rating.ride && (
                      <div className="mt-3 pl-13">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            {rating.ride.pickup_address?.split(",")[0] || "Pickup"}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            {rating.ride.dropoff_address?.split(",")[0] || "Dropoff"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5" />
                {isDriver ? "Tips for Better Ratings" : "What Makes a Great Driver?"}
              </CardTitle>
              <CardDescription>
                {isDriver 
                  ? "How to maintain a high rating as a driver" 
                  : "What to consider when rating drivers"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {isDriver ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Be Punctual</span>
                        <p className="text-sm text-muted-foreground">Arrive on time for pickups</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Safe Driving</span>
                        <p className="text-sm text-muted-foreground">Follow traffic rules and drive smoothly</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <User className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Clean Vehicle</span>
                        <p className="text-sm text-muted-foreground">Maintain a clean and comfortable car</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Good Communication</span>
                        <p className="text-sm text-muted-foreground">Keep passengers informed</p>
                      </div>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Punctuality</span>
                        <p className="text-sm text-muted-foreground">Did the driver arrive on time?</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Safe Driving</span>
                        <p className="text-sm text-muted-foreground">Was the ride smooth and safe?</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <User className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Cleanliness</span>
                        <p className="text-sm text-muted-foreground">Was the vehicle clean and comfortable?</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Communication</span>
                        <p className="text-sm text-muted-foreground">Was the driver friendly and communicative?</p>
                      </div>
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* How Ratings Work */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                How Ratings Work
              </CardTitle>
              <CardDescription>Understanding the rating system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                    <span className="font-medium">5 Stars - Excellent</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isDriver ? "Outstanding service in all aspects" : "Perfect ride experience"}
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                    <Star className="h-4 w-4 text-gray-300" />
                    <span className="font-medium">4 Stars - Good</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isDriver ? "Very good service with minor issues" : "Good ride with small areas for improvement"}
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {[...Array(3)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                    {[...Array(2)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-gray-300" />
                    ))}
                    <span className="font-medium">3 Stars - Average</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isDriver ? "Acceptable service with noticeable issues" : "Average experience with room for improvement"}
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="space-y-1">
                    <li>• Ratings are anonymous</li>
                    <li>• You can rate each ride only once</li>
                    <li>• Ratings help improve service quality for everyone</li>
                    {isDriver && <li>• Your average rating affects your visibility to passengers</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
