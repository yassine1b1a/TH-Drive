"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Car } from "lucide-react"
import { motion } from "framer-motion"
import { Suspense } from "react"

function ErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get("message") || "An error occurred during authentication"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-xl shadow-destructive/5">
          <CardHeader className="text-center pb-2">
            <Link
              href="/"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 transition-transform hover:scale-105"
            >
              <Car className="h-7 w-7 text-primary-foreground" />
            </Link>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
            <CardDescription className="text-destructive">{message}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              There was a problem verifying your account. This could be because the link has expired or has already been
              used.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/auth/signup">
                <Button className="w-full h-11 font-semibold shadow-lg shadow-primary/25">Try signing up again</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full h-11 font-medium bg-transparent">
                  Go to login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  )
}
