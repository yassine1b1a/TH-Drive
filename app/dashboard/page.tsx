'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Loader2, 
  User, 
  LogOut, 
  Car, 
  MapPin, 
  CreditCard, 
  Clock, 
  Star, 
  Shield, 
  Bell,
  History,
  AlertCircle,
  Package,
  Settings,
  HelpCircle
} from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: string
  rating: number | null
  total_rides: number | null
  is_banned: boolean
  warnings_count: number | null
  created_at: string
}

interface Ride {
  id: string
  status: string
  pickup_address: string | null
  dropoff_address: string | null
  fare: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface Stats {
  totalRides: number
  totalSpent: number
  averageRating: number
  activeRides: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentRides, setRecentRides] = useState<Ride[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // 1. Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/auth/login')
          return
        }

        // 2. Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          setError('Failed to load profile data')
          return
        }

        setProfile(profileData)

        // 3. Fetch recent rides (last 5)
        const { data: ridesData, error: ridesError } = await supabase
          .from('rides')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!ridesError) {
          setRecentRides(ridesData || [])
        }

        // 4. Calculate real stats from database
        if (ridesData) {
          const totalRides = ridesData.length
          const totalSpent = ridesData
            .filter(ride => ride.fare)
            .reduce((sum, ride) => sum + (ride.fare || 0), 0)
          const activeRides = ridesData.filter(ride => 
            ['pending', 'accepted', 'in_progress'].includes(ride.status)
          ).length

          setStats({
            totalRides,
            totalSpent,
            averageRating: profileData.rating || 0,
            activeRides
          })
        }

      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [router])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const handleBookRide = () => {
    router.push('/book-ride')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="mb-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Error Loading Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6" />
            </div>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Your profile could not be loaded</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} className="w-full">
              Sign Out and Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {profile.full_name || profile.email.split('@')[0]}!
              </h1>
              <p className="text-muted-foreground">
                {profile.role === 'driver' ? 'Driver Dashboard' : 'Passenger Dashboard'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Rides
              </CardTitle>
              <div className="flex items-center">
                <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {profile.total_rides || 0}
                </span>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Rating
              </CardTitle>
              <div className="flex items-center">
                <Star className="mr-2 h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {profile.rating?.toFixed(1) || '5.0'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">/5.0</span>
              </div>
            </CardHeader>
          </Card>

          {stats && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Spent
                  </CardTitle>
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold">
                      ${stats.totalSpent.toFixed(2)}
                    </span>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Rides
                  </CardTitle>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-bold">
                      {stats.activeRides}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Rides & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get where you need to go</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleBookRide} 
                    className="h-20 flex-col gap-2"
                    size="lg"
                  >
                    <Car className="h-6 w-6" />
                    <span>Book a Ride</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    size="lg"
                    onClick={() => router.push('/ride-history')}
                  >
                    <History className="h-6 w-6" />
                    <span>Ride History</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Rides */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Rides</CardTitle>
                    <CardDescription>Your recent trips</CardDescription>
                  </div>
                  {recentRides.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push('/ride-history')}
                    >
                      View All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recentRides.length > 0 ? (
                  <div className="space-y-4">
                    {recentRides.map((ride) => (
                      <div 
                        key={ride.id} 
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`rounded-full p-2 ${
                            ride.status === 'completed' ? 'bg-green-100 text-green-600' :
                            ride.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                            ride.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            <Car className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {ride.pickup_address?.split(',')[0] || 'Pickup location'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              to {ride.dropoff_address?.split(',')[0] || 'Destination'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                              </Badge>
                              {ride.fare && (
                                <span className="text-sm font-medium">
                                  ${ride.fare.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(ride.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ride.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No rides yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Book your first ride to get started
                    </p>
                    <Button onClick={handleBookRide} className="mt-4">
                      Book a Ride
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile & Support */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{profile.full_name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <Badge className="mt-1" variant="secondary">
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {profile.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="font-medium">{profile.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {profile.warnings_count && profile.warnings_count > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Warnings</span>
                      <Badge variant="outline" className="text-amber-600">
                        {profile.warnings_count}
                      </Badge>
                    </div>
                  )}

                  {profile.is_banned && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-center">
                      <p className="text-sm font-medium text-destructive">
                        Account Suspended
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card>
              <CardHeader>
                <CardTitle>Support</CardTitle>
                <CardDescription>Need help?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/support')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help Center
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/safety')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Safety Center
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/notifications')}>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}