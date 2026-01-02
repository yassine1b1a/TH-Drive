// components/driver/qr-scanner.tsx
'use client'

import { useState } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Camera, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export function QRScanner() {
  const [qrInput, setQrInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleScan = async () => {
    if (!qrInput.trim()) {
      toast.error("Please enter a QR code")
      return
    }

    setProcessing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Check QR code
      const { data: qrData, error } = await supabase
        .from('qr_codes')
        .select('*, ride:rides(*, user:profiles(*))')
        .eq('code', qrInput)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !qrData) {
        throw new Error("Invalid or expired QR code")
      }

      // Process payment
      const commission = qrData.amount * 0.05
      const driverEarnings = qrData.amount * 0.95

      // Update transaction
      await supabase
        .from('transactions')
        .update({
          qr_scanned_at: new Date().toISOString(),
          status: 'completed',
          from_wallet: true
        })
        .eq('ride_id', qrData.ride_id)

      // Mark QR as used
      await supabase
        .from('qr_codes')
        .update({
          is_used: true,
          scanned_by: user?.id
        })
        .eq('id', qrData.id)

      // Update driver earnings
      await supabase.rpc('increment_driver_earnings', {
        driver_id: user?.id,
        amount: driverEarnings
      })

      // Deduct from user wallet
      await supabase.rpc('update_wallet_balance', {
        user_id: qrData.user_id,
        amount: -qrData.amount
      })

      // Add commission to admin
      await supabase.rpc('add_admin_commission', {
        amount: commission
      })

      toast.success(`Payment received! You earned $${driverEarnings.toFixed(2)}`)
      setQrInput('')

    } catch (error: any) {
      toast.error(error.message || "Failed to process QR code")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          Scan QR Code
        </CardTitle>
        <CardDescription>Scan customer's QR code to receive payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Input */}
        <div className="space-y-3">
          <Label htmlFor="qr-code">QR Code</Label>
          <div className="flex gap-2">
            <Input
              id="qr-code"
              placeholder="Enter QR code or scan"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
            />
            <Button variant="outline" onClick={() => setScanning(!scanning)}>
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Camera Scanner (placeholder) */}
        {scanning && (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Camera scanner would appear here</p>
              <Button variant="outline" size="sm" onClick={() => setScanning(false)}>
                Close Camera
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-300 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">How it works:</p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Customer shows QR code from their phone</li>
                <li>• Scan or manually enter the code</li>
                <li>• 95% goes to your earnings immediately</li>
                <li>• 5% commission goes to TH-Drive</li>
              </ul>
            </div>
          </div>
        </div>

        <Button onClick={handleScan} disabled={processing || !qrInput.trim()} className="w-full">
          {processing ? "Processing..." : "Confirm Payment"}
        </Button>
      </CardContent>
    </Card>
  )
}
