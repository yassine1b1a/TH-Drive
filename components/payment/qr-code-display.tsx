"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Smartphone, RefreshCw, Check } from "lucide-react"

interface QRCodeDisplayProps {
  amount: number
  rideId: string
  onPaymentComplete: () => void
}

export function QRCodeDisplay({ amount, rideId, onPaymentComplete }: QRCodeDisplayProps) {
  const [isWaiting, setIsWaiting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes

  useEffect(() => {
    if (isWaiting && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isWaiting, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartPayment = () => {
    setIsWaiting(true)
    // Simulate payment completion after 3 seconds for demo
    setTimeout(() => {
      onPaymentComplete()
    }, 3000)
  }

  // Generate a simple QR code pattern using SVG
  const qrData = `thdrive://pay?ride=${rideId}&amount=${amount}`

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative rounded-2xl bg-white p-4 shadow-lg">
        {/* QR Code placeholder - in production, use a proper QR library */}
        <svg width="200" height="200" viewBox="0 0 200 200" className="rounded-lg">
          {/* QR Code Pattern */}
          <rect fill="white" width="200" height="200" />
          {/* Position detection patterns */}
          <rect fill="black" x="10" y="10" width="50" height="50" />
          <rect fill="white" x="17" y="17" width="36" height="36" />
          <rect fill="black" x="24" y="24" width="22" height="22" />

          <rect fill="black" x="140" y="10" width="50" height="50" />
          <rect fill="white" x="147" y="17" width="36" height="36" />
          <rect fill="black" x="154" y="24" width="22" height="22" />

          <rect fill="black" x="10" y="140" width="50" height="50" />
          <rect fill="white" x="17" y="147" width="36" height="36" />
          <rect fill="black" x="24" y="154" width="22" height="22" />

          {/* Data modules - simplified pattern */}
          {Array.from({ length: 10 }).map((_, row) =>
            Array.from({ length: 10 }).map((_, col) => {
              const x = 70 + col * 8
              const y = 70 + row * 8
              const hash = (row * 10 + col + rideId.length) % 3
              if (hash === 0) {
                return <rect key={`${row}-${col}`} fill="black" x={x} y={y} width="6" height="6" />
              }
              return null
            }),
          )}

          {/* Timing patterns */}
          {Array.from({ length: 15 }).map(
            (_, i) =>
              i % 2 === 0 && <rect key={`timing-h-${i}`} fill="black" x={10 + i * 8} y="68" width="6" height="6" />,
          )}
          {Array.from({ length: 15 }).map(
            (_, i) =>
              i % 2 === 0 && <rect key={`timing-v-${i}`} fill="black" x="68" y={10 + i * 8} width="6" height="6" />,
          )}
        </svg>

        {isWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm font-medium">Waiting for payment...</p>
              <p className="text-xs text-muted-foreground">{formatTime(timeLeft)}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold">${amount.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">Scan with your banking app</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Open your banking app to scan</span>
      </div>

      {!isWaiting ? (
        <Button onClick={handleStartPayment} className="w-full">
          <Check className="mr-2 h-4 w-4" />
          {"I've Scanned the Code"}
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setIsWaiting(false)} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Generate New Code
        </Button>
      )}
    </div>
  )
}
