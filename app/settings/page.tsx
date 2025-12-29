'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader2,
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Key,
  Smartphone as Phone,
  MapPin,
  Car,
  Download,
  Trash2,
  LogOut
} from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: string
  is_banned: boolean
  warnings_count: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}

interface NotificationSettings {
  ride_updates: boolean
  promotional: boolean
  security_alerts: boolean
  driver_messages: boolean
  email_notifications: boolean
  push_notifications: boolean
}

interface PrivacySettings {
  share_location: boolean
  show_rating: boolean
  share_ride_history: boolean
  searchable: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  
  // Settings states
  const [notifications, setNotifications] = useState<NotificationSettings>({
    ride_updates: true,
    promotional: false,
    security_alerts: true,
    driver_messages: true,
    email_notifications: true,
    push_notifications: true,
  })
  
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    share_location: true,
    show_rating: true,
    share_ride_history: false,
    searchable: true,
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/auth/login')
          return
        }

        // Get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          return
        }

        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          current_password: '',
          new_password: '',
          confirm_password: '',
        })

      } catch (err) {
        console.error('Settings fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleProfileUpdate = async () => {
    if (!profile) return
    
    setSaving(true)
    setSaveSuccess(null)
    setSaveError(null)

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      setSaveSuccess('Profile updated successfully')
      setTimeout(() => setSaveSuccess(null), 3000)
      
      // Refresh profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()
      
      setProfile(updatedProfile)

    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (formData.new_password !== formData.confirm_password) {
      setSaveError('New passwords do not match')
      return
    }

    if (formData.new_password.length < 6) {
      setSaveError('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    setSaveSuccess(null)
    setSaveError(null)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: formData.new_password
      })

      if (error) throw error

      setSaveSuccess('Password updated successfully')
      setTimeout(() => setSaveSuccess(null), 3000)
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }))

    } catch (err: any) {
      setSaveError(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationsSave = async () => {
    setSaving(true)
    try {
      // Save to local storage for now
      localStorage.setItem('th_drive_notifications', JSON.stringify(notifications))
      setSaveSuccess('Notification preferences saved')
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (err) {
      setSaveError('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const handlePrivacySave = async () => {
    setSaving(true)
    try {
      // Save to local storage for now
      localStorage.setItem('th_drive_privacy', JSON.stringify(privacy))
      setSaveSuccess('Privacy settings saved')
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (err) {
      setSaveError('Failed to save privacy settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account preferences and security
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-1">
                  <Button
                    variant={activeTab === 'profile' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                  <Button
                    variant={activeTab === 'security' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('security')}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </Button>
                  <Button
                    variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('notifications')}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Button>
                  <Button
                    variant={activeTab === 'privacy' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('privacy')}
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Privacy
                  </Button>
                  {profile.role === 'driver' && (
                    <Button
                      variant={activeTab === 'driver' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveTab('driver')}
                    >
                      <Car className="mr-2 h-4 w-4" />
                      Driver Settings
                    </Button>
                  )}
                </div>

                <Separator className="my-6" />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Account Status</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <Badge variant="secondary">{profile.role}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={profile.is_banned ? 'destructive' : 'default'}>
                        {profile.is_banned ? 'Banned' : 'Active'}
                      </Badge>
                    </div>
                    {profile.warnings_count > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Warnings</span>
                        <Badge variant="outline" className="text-amber-600">
                          {profile.warnings_count}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            {saveSuccess && (
              <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            )}

            {saveError && (
              <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          Change Avatar
                        </Button>
                        <p className="mt-2 text-sm text-muted-foreground">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-sm text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                          type="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Created</Label>
                      <p className="text-sm">
                        {new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={saving || (!formData.full_name && !formData.phone)}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current_password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current_password"
                              type={showPassword ? 'text' : 'password'}
                              value={formData.current_password}
                              onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                              placeholder="Enter current password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new_password">New Password</Label>
                            <Input
                              id="new_password"
                              type={showPassword ? 'text' : 'password'}
                              value={formData.new_password}
                              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                              placeholder="Enter new password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirm Password</Label>
                            <Input
                              id="confirm_password"
                              type={showPassword ? 'text' : 'password'}
                              value={formData.confirm_password}
                              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Security Recommendations</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">Two-Factor Authentication</p>
                              <p className="text-sm text-muted-foreground">
                                Add an extra layer of security to your account
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Enable
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">Active Sessions</p>
                              <p className="text-sm text-muted-foreground">
                                View and manage your active login sessions
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={saving || !formData.new_password || !formData.confirm_password}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Ride Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="ride_updates">Ride Status Updates</Label>
                            <p className="text-sm text-muted-foreground">
                              Get notified about ride requests, driver arrival, and trip completion
                            </p>
                          </div>
                          <Switch
                            id="ride_updates"
                            checked={notifications.ride_updates}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, ride_updates: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="driver_messages">Driver Messages</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive messages from your driver during the ride
                            </p>
                          </div>
                          <Switch
                            id="driver_messages"
                            checked={notifications.driver_messages}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, driver_messages: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Account Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="security_alerts">Security Alerts</Label>
                            <p className="text-sm text-muted-foreground">
                              Important security notifications about your account
                            </p>
                          </div>
                          <Switch
                            id="security_alerts"
                            checked={notifications.security_alerts}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, security_alerts: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="promotional">Promotional Offers</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive offers, discounts, and promotional content
                            </p>
                          </div>
                          <Switch
                            id="promotional"
                            checked={notifications.promotional}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, promotional: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Notification Methods</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="email_notifications">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive notifications via email
                            </p>
                          </div>
                          <Switch
                            id="email_notifications"
                            checked={notifications.email_notifications}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, email_notifications: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="push_notifications">Push Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive push notifications on your device
                            </p>
                          </div>
                          <Switch
                            id="push_notifications"
                            checked={notifications.push_notifications}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, push_notifications: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button onClick={handleNotificationsSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Preferences'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Location Privacy</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="share_location">Share Location</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow drivers to see your location for better pickup accuracy
                            </p>
                          </div>
                          <Switch
                            id="share_location"
                            checked={privacy.share_location}
                            onCheckedChange={(checked) =>
                              setPrivacy({ ...privacy, share_location: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Profile Visibility</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="show_rating">Show My Rating</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow others to see your average rating
                            </p>
                          </div>
                          <Switch
                            id="show_rating"
                            checked={privacy.show_rating}
                            onCheckedChange={(checked) =>
                              setPrivacy({ ...privacy, show_rating: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="searchable">Make Profile Searchable</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow drivers to find your profile by name or phone
                            </p>
                          </div>
                          <Switch
                            id="searchable"
                            checked={privacy.searchable}
                            onCheckedChange={(checked) =>
                              setPrivacy({ ...privacy, searchable: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Data Sharing</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="share_ride_history">Share Ride History</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow TH-Drive to use your ride data for service improvement
                            </p>
                          </div>
                          <Switch
                            id="share_ride_history"
                            checked={privacy.share_ride_history}
                            onCheckedChange={(checked) =>
                              setPrivacy({ ...privacy, share_ride_history: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Data Management</h3>
                      <div className="space-y-4">
                        <Button variant="outline" className="w-full justify-start">
                          <Download className="mr-2 h-4 w-4" />
                          Download Your Data
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button onClick={handlePrivacySave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Privacy Settings'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Driver Settings Tab */}
            {activeTab === 'driver' && profile.role === 'driver' && (
              <Card>
                <CardHeader>
                  <CardTitle>Driver Settings</CardTitle>
                  <CardDescription>
                    Manage your driver preferences and vehicle information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Car className="h-4 w-4" />
                    <AlertTitle>Driver Account</AlertTitle>
                    <AlertDescription>
                      Your account is configured as a driver. You can accept ride requests and earn money.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Availability</h3>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-medium">Go Online</p>
                          <p className="text-sm text-muted-foreground">
                            Start accepting ride requests
                          </p>
                        </div>
                        <Button variant="outline">Go Online</Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Vehicle Make</Label>
                            <Input placeholder="Toyota" disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Vehicle Model</Label>
                            <Input placeholder="Camry" disabled />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>License Plate</Label>
                            <Input placeholder="ABC123" disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Vehicle Color</Label>
                            <Input placeholder="Black" disabled />
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="mt-4">
                        Update Vehicle Info
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Earnings & Payments</h3>
                      <Button variant="outline" className="w-full justify-start">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Set Up Payment Method
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}