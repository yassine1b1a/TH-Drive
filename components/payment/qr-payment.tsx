// components/payment/qr-payment.tsx - Alternative without qrcode.react
'use client'

import { useState, useEffect } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download, QrCode } from "lucide-react"
import { toast } from "sonner"

interface QRPaymentProps {
  rideId: string
  amount: number
  commission: number
  driverEarnings: number
}

export function QRPayment({ rideId, amount, commission, driverEarnings }: QRPaymentProps) {
  const [qrCode, setQrCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateQRCode()
  }, [])

  const generateQRCode = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Generate unique QR code
    const code = `THDRIVE-${rideId}-${Date.now()}`
    
    // Save QR code to database
    await supabase.from('qr_codes').insert({
      user_id: user?.id,
      amount: amount,
      code: code,
      ride_id: rideId
    })
    
    setQrCode(code)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCode)
    setCopied(true)
    toast.success("QR code copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const generateQRImageURL = () => {
    // Generate QR code URL using a free service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          Scan QR Code
        </CardTitle>
        <CardDescription>Show this QR code to the driver for payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Image from external service */}
        <div className="flex flex-col items-center space-y-4">
          <div className="border-2 border-primary p-4 rounded-lg">
            {qrCode ? (
              <img 
                src={generateQRImageURL()} 
                alt="QR Code" 
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Generating QR code...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Code Display */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Payment Code:</p>
            <div className="flex items-center gap-2 justify-center">
              <code className="bg-muted px-3 py-1 rounded text-sm font-mono">{qrCode || "Generating..."}</code>
              <Button
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
                title="Copy code"
                disabled={!qrCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Ride Amount</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Commission (5%)</span>
            <span className="font-medium">-${commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Driver Receives</span>
            <span className="text-lg font-bold text-green-600">${driverEarnings.toFixed(2)}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How to use:</strong> Show this QR code to your driver. They will scan it to receive payment.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => window.open(generateQRImageURL(), '_blank')}
            disabled={!qrCode}
          >
            <Download className="mr-2 h-4 w-4" />
            Open QR
          </Button>
          <Button className="flex-1" onClick={generateQRCode}>
            Regenerate QR
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
