'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, Loader2, ArrowLeft, CheckCircle, AlertCircle, Car, User } from 'lucide-react'
import { toast } from 'sonner'

interface RideInfo {
  id: string
  pickup_address: string | null
  dropoff_address: string | null
  driver?: {
    full_name: string | null
    rating: number | null
  }
  user?: {
    full_name: string | null
  }
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
  const [alreadyRated, setAlreadyRated] = useState(false)

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

      // Fetch ride details
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select(`
          id,
          pickup_address,
          dropoff_address,
          status,
          completed_at,
          driver:profiles!rides_driver_id_fkey (
            full_name,
            rating
          ),
          user:profiles!rides_user_id_fkey (
            full_name
          ),
          ratings!inner (
            id
          )
        `)
        .eq('id', rideId)
        .eq('user_id', user.id)
        .single()

      if (rideError) {
        // Check if ride exists but user doesn't have permission
        const { data: checkRide } = await supabase
          .from('rides')
          .select('id')
          .eq('id', rideId)
          .single()

        if (!checkRide) {
          setError('Ride not found')
        } else {
          setError('You do not have permission to rate this ride')
        }
        return
      }

      // Check if ride is completed
      if (rideData.status !== 'completed') {
        setError('You can only rate completed rides')
        return
      }

      // Check if already rated (if ratings array has items)
      if (rideData.ratings && rideData.ratings.length > 0) {
        setAlreadyRated(true)
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
    if (!ride || !rating) {
      toast.error('Please select a rating')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        router.push('/login')
        return
      }

      // Submit rating
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          ride_id: rideId,
          rater_id: user.id,
          rated_id: ride.driver?.id, // This should be the driver's ID
          rating: rating,
          comment: comment.trim() || null
        })

      if (ratingError) throw ratingError

      toast.success('Rating submitted successfully!')
      
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

  if (alreadyRated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-green-500 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Already Rated
            </CardTitle>
            <CardDescription>You have already rated this ride.</CardDescription>
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
              Share your experience to help improve our service
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

              {ride?.driver && (
                <div className="flex items-center gap-3 p-3 bg-background rounded">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{ride.driver.full_name || 'Driver'}</p>
                    <p className="text-sm text-muted-foreground">
                      {ride.driver.rating ? `${ride.driver.rating.toFixed(1)}/5` : 'No rating yet'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Star Rating */}
            <div className="space-y-3">
              <Label htmlFor="rating">Rate your experience</Label>
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
              <Label htmlFor="comment">Additional comments (optional)</Label>
              <Textarea
                id="comment"
                placeholder="Tell us about your experience. Was the driver on time? Was the ride comfortable?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Your feedback helps us improve our service for everyone.
              </p>
            </div>

            {/* Rating Guidelines */}
            <div className="space-y-2 text-sm">
              <p className="font-medium">Rating Guidelines:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>5 stars: Excellent service, on time, clean vehicle</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>3 stars: Average experience, some issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>1 star: Poor experience, significant issues</span>
                </li>
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
            Your rating is anonymous and will help improve our service quality.
          </p>
        </div>
      </div>
    </div>
  )
}
