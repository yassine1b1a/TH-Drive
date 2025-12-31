'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, Loader2, ArrowLeft, CheckCircle, AlertCircle, Car, User, Shield,RefreshCw, MessageSquare } from 'lucide-react'
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
  const rideId = params.rideId as string
  
  const [ride, setRide] = useState<RideInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'driver' | null>(null)
  const [personToRate, setPersonToRate] = useState<{ id: string; name: string; role: 'user' | 'driver' } | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    console.log('RateRidePage mounted, rideId:', rideId)
    if (rideId && rideId !== 'undefined') {
      loadRideInfo()
    } else {
      setError('Invalid ride ID')
      setLoading(false)
    }
  }, [rideId])

  const loadRideInfo = async () => {
    console.log('Starting loadRideInfo for rideId:', rideId)
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      console.log('Supabase client created')
      
      // Get current user
      console.log('Getting current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User data:', user, 'Error:', userError)
      
      if (userError) {
        console.error('Error getting user:', userError)
        setDebugInfo(`User error: ${userError.message}`)
        throw userError
      }
      
      if (!user) {
        console.log('No user found, redirecting to login')
        setDebugInfo('No user found')
        router.push('/login')
        return
      }

      console.log('Current user ID:', user.id)
      setCurrentUserId(user.id)
      setDebugInfo(`User ID: ${user.id}`)

      // Fetch ride details
      console.log('Fetching ride details...')
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

      console.log('Ride data response:', rideData)
      console.log('Ride error:', rideError)

      if (rideError) {
        console.error('Error fetching ride:', rideError)
        setDebugInfo(`Ride fetch error: ${rideError.message}`)
        if (rideError.code === 'PGRST116') {
          setError('Ride not found. Please check the ride ID.')
        } else {
          setError(`Failed to load ride: ${rideError.message}`)
        }
        return
      }

      if (!rideData) {
        setError('No ride data found')
        setDebugInfo('rideData is null')
        return
      }

      console.log('Ride loaded:', {
        id: rideData.id,
        user_id: rideData.user_id,
        driver_id: rideData.driver_id,
        status: rideData.status
      })

      // Check if ride is completed
      if (rideData.status !== 'completed') {
        setError(`You can only rate completed rides. Current status: ${rideData.status}`)
        setDebugInfo(`Ride status: ${rideData.status}`)
        return
      }

      // Determine user role and who they should rate
      const isUser = rideData.user_id === user.id
      const isDriver = rideData.driver_id === user.id
      
      console.log('Role check:', { 
        isUser, 
        isDriver, 
        rideUserId: rideData.user_id, 
        rideDriverId: rideData.driver_id,
        currentUserId: user.id 
      })

      if (!isUser && !isDriver) {
        setError('You are not authorized to rate this ride')
        setDebugInfo(`User ${user.id} is not associated with ride ${rideId}`)
        return
      }

      const role = isUser ? 'user' : 'driver'
      setUserRole(role)
      console.log('User role determined:', role)

      // Determine who the user should rate
      let personToRate = null
      if (isUser && rideData.driver?.[0]) {
        personToRate = {
          id: rideData.driver[0].id,
          name: rideData.driver[0].full_name || 'Driver',
          role: 'driver' as const
        }
        console.log('User rating driver:', personToRate)
      } else if (isDriver && rideData.user?.[0]) {
        personToRate = {
          id: rideData.user[0].id,
          name: rideData.user[0].full_name || 'Passenger',
          role: 'user' as const
        }
        console.log('Driver rating user:', personToRate)
      } else {
        console.log('No person to rate found:', { 
          isUser, 
          isDriver, 
          driverExists: rideData.driver?.[0], 
          userExists: rideData.user?.[0] 
        })
      }

      setPersonToRate(personToRate)

      // Check if user has already rated this person for this ride
      if (personToRate && rideData.ratings) {
        const hasAlreadyRated = rideData.ratings.some(
          (r: any) => r.rater_id === user.id && r.rated_id === personToRate.id
        )
        
        console.log('Already rated check:', { 
          hasAlreadyRated, 
          ratingsCount: rideData.ratings?.length,
          ratings: rideData.ratings
        })
        
        if (hasAlreadyRated) {
          setError('You have already rated this person for this ride')
          return
        }
      }

      setRide(rideData as RideInfo)
      console.log('Ride successfully loaded and set')
      
    } catch (error: any) {
      console.error('Error in loadRideInfo:', error)
      setError(`Failed to load ride information: ${error?.message || 'Unknown error'}`)
      setDebugInfo(`Catch error: ${error?.message}`)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const handleSubmitRating = async () => {
    console.log('Submit rating clicked:', { rating, comment, personToRate, currentUserId, rideId })
    
    if (!ride || !rating || !personToRate || !currentUserId) {
      console.error('Missing data:', { ride, rating, personToRate, currentUserId })
      toast.error('Please select a rating')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      console.log('Submitting rating with data:', {
        ride_id: rideId,
        rater_id: currentUserId,
        rated_id: personToRate.id,
        rating: rating,
        comment: comment.trim() || null
      })

      // Submit rating
      const { data, error: ratingError } = await supabase
        .from('ratings')
        .insert({
          ride_id: rideId,
          rater_id: currentUserId,
          rated_id: personToRate.id,
          rating: rating,
          comment: comment.trim() || null
        })
        .select()
        .single()

      console.log('Rating submission result:', { data, ratingError })

      if (ratingError) {
        console.error('Rating error details:', ratingError)
        if (ratingError.code === '23505') { // Unique violation
          toast.error('You have already rated this person for this ride')
        } else if (ratingError.message.includes('foreign key constraint')) {
          toast.error('Unable to submit rating. Please try again or contact support.')
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
      
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      toast.error(error.message || 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    console.log('Retrying load...')
    setLoading(true)
    setError(null)
    loadRideInfo()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading ride information...</p>
          <p className="text-xs text-muted-foreground mt-2">Ride ID: {rideId}</p>
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="mt-4"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
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
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ride ID: {rideId}
              </p>
              {debugInfo && (
                <div className="p-3 bg-muted rounded text-xs font-mono overflow-auto">
                  <p className="font-semibold mb-1">Debug Info:</p>
                  <p>{debugInfo}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/ride-history')} 
              className="w-full"
            >
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
            {/* Debug info - visible for debugging */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <p className="font-semibold">Debug Info:</p>
              <p>Ride ID: {rideId}</p>
              <p>User Role: {userRole}</p>
              <p>Current User ID: {currentUserId}</p>
              <p>Person to Rate: {personToRate?.name} ({personToRate?.id})</p>
              <p>Rating: {rating}</p>
            </div>

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
              disabled={submitting || !rating || !personToRate}
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
