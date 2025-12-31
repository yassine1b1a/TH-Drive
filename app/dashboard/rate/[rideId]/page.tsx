'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, Loader2, ArrowLeft, CheckCircle, AlertCircle, Car, User, Shield, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface RideInfo {
  id: string
  user_id: string
  driver_id: string | null
  pickup_address: string | null
  dropoff_address: string | null
  status: string
  completed_at: string | null
  user: {
    full_name: string | null
    id: string
  }[]
  driver: {
    full_name: string | null
    id: string
  }[]
  ratings: {
    id: string
    rater_id: string
    rated_id: string
    rating: number
    comment: string | null
  }[]
}

export default function RateRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  
  const [ride, setRide] = useState<RideInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'driver' | null>(null)
  const [personToRate, setPersonToRate] = useState<{ id: string; name: string; role: 'user' | 'driver' } | null>(null)

  useEffect(() => {
    if (rideId) {
      loadRideInfo()
    }
  }, [rideId])

  const loadRideInfo = async () => {
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      // Fetch ride details
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select(`
          id,
          user_id,
          driver_id,
          pickup_address,
          dropoff_address,
          status,
          completed_at,
          user:profiles!rides_user_id_fkey (
            full_name,
            id
          ),
          driver:profiles!rides_driver_id_fkey (
            full_name,
            id
          ),
          ratings (
            id,
            rater_id,
            rated_id,
            rating,
            comment
          )
        `)
        .eq('id', rideId)
        .single()

      if (rideError) {
        setError('Ride not found')
        return
      }

      // Check if ride is completed
      if (rideData.status !== 'completed') {
        setError('You can only rate completed rides')
        return
      }

      // Determine user role and who they should rate
      const isUser = rideData.user_id === user.id
      const isDriver = rideData.driver_id === user.id
      
      if (!isUser && !isDriver) {
        setError('You are not authorized to rate this ride')
        return
      }

      setUserRole(isUser ? 'user' : 'driver')

      // Determine who the user should rate
      let personToRate = null
      if (isUser && rideData.driver?.[0]) {
        personToRate = {
          id: rideData.driver[0].id,
          name: rideData.driver[0].full_name || 'Driver',
          role: 'driver' as const
        }
      } else if (isDriver && rideData.user?.[0]) {
        personToRate = {
          id: rideData.user[0].id,
          name: rideData.user[0].full_name || 'Passenger',
          role: 'user' as const
        }
      }

      setPersonToRate(personToRate)

      // Check if user has already rated this person for this ride
      if (personToRate) {
        const hasAlreadyRated = rideData.ratings?.some(
          r => r.rater_id === user.id && r.rated_id === personToRate.id
        )
        
        if (hasAlreadyRated) {
          setError('You have already rated this person for this ride')
          return
        }
      }

      setRide(rideData as RideInfo)
    } catch (error) {
      console.error('Error loading ride:', error)
      setError('Failed to load ride information')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!ride || !rating || !personToRate || !currentUserId) {
      toast.error('Please select a rating')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      // Submit rating
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          ride_id: rideId,
          rater_id: currentUserId,
          rated_id: personToRate.id,
          rating: rating,
          comment: comment.trim() || null
        })

      if (ratingError) {
        if (ratingError.code === '23505') { // Unique violation
          toast.error('You have already rated this person for this ride')
        } else {
          throw ratingError
        }
        return
      }

      toast.success(`Rating submitted successfully! Thank you for your feedback.`)
      
      // Redirect to ride history after 2 seconds
      setTimeout(() => {
        router.push('/ride-history')
      }, 2000)
      
    } catch (error) {
      console.error('Error submitting rating:', error)
      toast.error('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading ride information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Unable to Rate Ride
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/ride-history')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ride History
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/ride-history')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Ride History
        </Button>

        <Card className="border-2 border-primary/10 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Rate Your Ride</CardTitle>
            <CardDescription>
              {userRole === 'user' 
                ? 'Rate your driver to help maintain service quality'
                : 'Rate the passenger to provide feedback'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Ride Details */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  <span className="font-medium">Ride Details</span>
                </div>
                <span className="text-xs text-muted-foreground">ID: {rideId.slice(0, 8)}...</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pickup</p>
                    <p className="text-sm text-muted-foreground">
                      {ride?.pickup_address || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Dropoff</p>
                    <p className="text-sm text-muted-foreground">
                      {ride?.dropoff_address || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Person being rated */}
              <div className="flex items-center gap-3 p-3 bg-background rounded">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {personToRate?.role === 'driver' ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{personToRate?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {userRole === 'user' 
                      ? 'Your driver for this ride'
                      : 'Your passenger for this ride'
                    }
                  </p>
                </div>
                <div className="text-xs px-2 py-1 bg-muted rounded">
                  {personToRate?.role === 'driver' ? 'Driver' : 'Passenger'}
                </div>
              </div>
            </div>

            {/* Your Role */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium">You are rating as:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {userRole === 'user' 
                  ? 'Passenger rating your driver'
                  : 'Driver rating your passenger'
                }
              </p>
            </div>

            {/* Star Rating */}
            <div className="space-y-3">
              <Label htmlFor="rating">
                {userRole === 'user' 
                  ? 'Rate your driver\'s service'
                  : 'Rate the passenger\'s behavior'
                }
              </Label>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= rating
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {rating === 5 && 'Excellent'}
                {rating === 4 && 'Good'}
                {rating === 3 && 'Average'}
                {rating === 2 && 'Poor'}
                {rating === 1 && 'Very Poor'}
              </p>
            </div>

            {/* Comment */}
            <div className="space-y-3">
              <Label htmlFor="comment">
                {userRole === 'user' 
                  ? 'Tell us about your experience (optional)'
                  : 'Any feedback for the passenger? (optional)'
                }
              </Label>
              <Textarea
                id="comment"
                placeholder={
                  userRole === 'user'
                    ? "Was the driver on time? Was the ride comfortable? Any suggestions for improvement?"
                    : "Was the passenger punctual? Any issues during the ride?"
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Your feedback is anonymous and helps improve the platform for everyone.
              </p>
            </div>

            {/* Rating Guidelines */}
            <div className="space-y-2 text-sm">
              <p className="font-medium">Rating Guidelines:</p>
              <ul className="space-y-1 text-muted-foreground">
                {userRole === 'user' ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>5 stars: Excellent service, on time, clean vehicle, safe driving</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>3 stars: Average experience, minor issues</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>1 star: Poor experience, significant safety or service issues</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>5 stars: Punctual, respectful, no issues</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>3 stars: Minor delays, average behavior</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>1 star: Significant issues, disrespectful, caused problems</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              onClick={handleSubmitRating}
              disabled={submitting || !rating}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Rating
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/ride-history')}
              className="w-full"
            >
              Skip Rating
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {userRole === 'user'
              ? 'Your rating helps drivers improve their service. The driver will also have the opportunity to rate you.'
              : 'Your rating helps maintain a safe and respectful community. The passenger will also have the opportunity to rate you.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
