"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Car, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export default function DriverSignUpPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [vehicleMake, setVehicleMake] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [vehicleYear, setVehicleYear] = useState("")
  const [vehicleColor, setVehicleColor] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const checkExistingUser = async (email: string) => {
    const supabase = createClient()
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      if (error) throw error
      
      const user = users.find(u => u.email === email)
      if (user) {
        return {
          exists: true,
          verified: !!user.email_confirmed_at,
          user: user
        }
      }
      return { exists: false, verified: false, user: null }
    } catch (err) {
      console.error('Error checking user:', err)
      return { exists: false, verified: false, user: null }
    }
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setError(null)
    setStep(2)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`

      // Check if user already exists and is unverified
      const existingUser = await checkExistingUser(email)
      
      if (existingUser.exists && !existingUser.verified) {
        // User exists but is unverified - resend verification
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        })

        if (resendError) throw resendError
        
        localStorage.setItem('unverified_email', email)
        router.push('/auth/verify?message=verification_resent')
        return
      }

      if (existingUser.exists && existingUser.verified) {
        setError('An account with this email already exists. Please log in.')
        setIsLoading(false)
        return
      }

      // Create new driver account
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone,
            role: "driver",
            license_number: licenseNumber,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_year: Number.parseInt(vehicleYear),
            vehicle_color: vehicleColor,
            vehicle_plate: vehiclePlate,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          // User exists but not in our check - resend verification
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: redirectUrl,
            },
          })

          if (resendError) throw resendError
          
          localStorage.setItem('unverified_email', email)
          router.push('/auth/verify?message=verification_resent')
          return
        }
        throw authError
      }
      
      localStorage.setItem('unverified_email', email)
      router.push('/auth/verify?message=check_email')
      
    } catch (err) {
      console.error('Driver signup error:', err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <Link
              href="/"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 transition-transform hover:scale-105"
            >
              <Car className="h-7 w-7 text-primary-foreground" />
            </Link>
            <CardTitle className="text-2xl font-bold">Become a Driver</CardTitle>
            <CardDescription>
              {step === 1 ? "Step 1: Personal Information" : "Step 2: Vehicle Information"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {step === 1 ? (
              <form onSubmit={handleNext} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}
                <Button type="submit" className="w-full h-11 font-semibold shadow-lg shadow-primary/25">
                  Next
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Driver License Number</Label>
                  <Input
                    id="licenseNumber"
                    type="text"
                    placeholder="DL12345678"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleMake">Vehicle Make</Label>
                    <Input
                      id="vehicleMake"
                      type="text"
                      placeholder="Toyota"
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Vehicle Model</Label>
                    <Input
                      id="vehicleModel"
                      type="text"
                      placeholder="Camry"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear">Year</Label>
                    <Input
                      id="vehicleYear"
                      type="number"
                      placeholder="2022"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleColor">Color</Label>
                    <Input
                      id="vehicleColor"
                      type="text"
                      placeholder="Black"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">License Plate</Label>
                  <Input
                    id="vehiclePlate"
                    type="text"
                    placeholder="ABC 1234"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-full h-11 font-medium"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold shadow-lg shadow-primary/25"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}