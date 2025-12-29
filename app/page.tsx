"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Car, Shield, MapPin, Star, ArrowRight, Zap, CreditCard } from "lucide-react"
import { motion } from "framer-motion"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg"
      >
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary transition-transform group-hover:scale-105">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TH-Drive</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-medium">
                Login
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="font-medium shadow-lg shadow-primary/25 transition-shadow hover:shadow-primary/40">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Zap className="h-4 w-4 text-primary" />
              Fast, Safe & Reliable Rides
            </motion.div>

            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Your Ride, <span className="text-primary">Your Way</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty leading-relaxed">
              TH-Drive connects you with reliable drivers in your area. Experience seamless booking, real-time tracking,
              and secure payments - all in one app.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.02]"
                >
                  Start Riding
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/signup/driver">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base font-semibold bg-transparent transition-all hover:scale-[1.02]"
                >
                  Become a Driver
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-8"
            >
              {[
                { value: "10K+", label: "Active Riders" },
                { value: "2K+", label: "Verified Drivers" },
                { value: "4.9", label: "Average Rating" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why Choose TH-Drive?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              We combine cutting-edge technology with exceptional service to deliver the best ride experience.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: MapPin,
                title: "Real-Time Tracking",
                description: "Track your ride in real-time with our advanced OpenStreetMap integration.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Shield,
                title: "Safe & Secure",
                description: "All drivers are verified. Our rating system ensures quality service.",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: CreditCard,
                title: "Easy Payments",
                description: "Pay seamlessly with card or QR code. Multiple options available.",
                color: "text-chart-4",
                bg: "bg-chart-4/10",
              },
              {
                icon: Star,
                title: "Top Rated",
                description: "Consistently rated 4.9+ stars by thousands of satisfied riders.",
                color: "text-chart-5",
                bg: "bg-chart-5/10",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} transition-transform group-hover:scale-110`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-primary p-12 text-center text-primary-foreground"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Get Started?</h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
                Join thousands of riders who trust TH-Drive for their daily commute.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup">
                  <Button size="lg" variant="secondary" className="h-12 px-8 font-semibold">
                    Sign Up Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Car className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">TH-Drive</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 TH-Drive. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
