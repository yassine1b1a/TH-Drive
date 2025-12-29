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

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const checkExistingUser = async (email: string) => {
    const supabase = createClient()
    try {
      // Try to get user by email
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const redirectUrl = `${window.location.origin}/auth/callback`

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
        
        // Store email in localStorage to show verification page
        localStorage.setItem('unverified_email', email)
        router.push('/auth/verify?message=verification_resent')
        return
      }

      if (existingUser.exists && existingUser.verified) {
        setError('An account with this email already exists. Please log in.')
        setIsLoading(false)
        return
      }

      // Create new user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone,
            role: "user",
          },
        },
      })

      if (authError) {
        // Handle specific error cases
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

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("This email is already registered. Please check your email for verification.")
        setIsLoading(false)
        return
      }

      // Success - store email and redirect to verification page
      localStorage.setItem('unverified_email', email)
      router.push('/auth/verify?message=check_email')

    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : "An error occurred during signup")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background decoration */}
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
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Sign up as a rider to start booking rides</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSignUp} className="space-y-4">
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
              <Button
                type="submit"
                className="w-full h-11 font-semibold shadow-lg shadow-primary/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Link href="/auth/signup/driver" className="block">
                <Button variant="outline" className="w-full h-11 bg-transparent font-medium">
                  Sign up as a Driver
                </Button>
              </Link>
            </div>

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