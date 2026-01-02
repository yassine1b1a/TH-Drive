// components/payment/qr-payment.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, Download } from "lucide-react"
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

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg")
    const svgData = new XMLSerializer().serializeToString(svg!)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx!.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.download = `th-drive-qr-${rideId}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan QR Code</CardTitle>
        <CardDescription>Show this QR code to the driver for payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex flex-col items-center space-y-4">
          <div className="border-2 border-primary p-4 rounded-lg">
            <QRCodeSVG
              id="qr-code-svg"
              value={qrCode}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          {/* Code Display */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Payment Code:</p>
            <div className="flex items-center gap-2 justify-center">
              <code className="bg-muted px-3 py-1 rounded text-sm">{qrCode}</code>
              <Button
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
                title="Copy code"
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={downloadQR}>
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
          <Button className="flex-1" onClick={generateQRCode}>
            Regenerate QR
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
