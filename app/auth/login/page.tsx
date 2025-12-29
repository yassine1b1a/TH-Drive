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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Car, User, Shield, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loginType, setLoginType] = useState<"user" | "driver" | "admin">("user")
  const router = useRouter()

  const checkUserVerification = async (userId: string) => {
    const supabase = createClient()
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      
      if (!user?.email_confirmed_at) {
        // User is not verified
        localStorage.setItem('unverified_email', user?.email || email)
        router.push('/auth/verify?message=verify_to_continue')
        return false
      }
      return true
    } catch (err) {
      console.error('Error checking verification:', err)
      return false
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // Check if user exists but is unverified
        if (authError.message.includes('Email not confirmed')) {
          localStorage.setItem('unverified_email', email)
          router.push('/auth/verify?message=verify_to_continue')
          return
        }
        throw authError
      }

      // Check if user is verified
      const isVerified = await checkUserVerification(data.user.id)
      if (!isVerified) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_banned")
        .eq("id", data.user.id)
        .single()

      if (profile?.is_banned) {
        await supabase.auth.signOut()
        throw new Error("Your account has been banned. Please contact support.")
      }

      if (loginType === "admin" && !["admin", "moderator"].includes(profile?.role || "")) {
        throw new Error("You do not have admin access.")
      }

      if (loginType === "driver" && profile?.role !== "driver") {
        throw new Error("This account is not registered as a driver.")
      }

      // All checks passed - redirect to appropriate dashboard
      switch (profile?.role) {
        case "admin":
        case "moderator":
          router.push("/admin")
          break
        case "driver":
          router.push("/driver")
          break
        default:
          router.push("/dashboard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
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
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to your TH-Drive account</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={loginType} onValueChange={(v) => setLoginType(v as typeof loginType)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="user" className="flex items-center gap-1.5 data-[state=active]:shadow-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Rider</span>
                </TabsTrigger>
                <TabsTrigger value="driver" className="flex items-center gap-1.5 data-[state=active]:shadow-sm">
                  <Car className="h-4 w-4" />
                  <span className="hidden sm:inline">Driver</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-1.5 data-[state=active]:shadow-sm">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={loginType} className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
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
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}
                  <div className="flex justify-end">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-primary hover:underline underline-offset-4"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold shadow-lg shadow-primary/25"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/auth/signup" className="text-primary font-medium hover:underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}