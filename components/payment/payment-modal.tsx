"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, QrCode, Check, Loader2 } from "lucide-react"
import { QRCodeDisplay } from "./qr-code-display"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount: number
  rideId: string
  paymentMethod: "card" | "qr_code"
}

export function PaymentModal({ isOpen, onClose, onSuccess, amount, rideId, paymentMethod }: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"card" | "qr_code">(paymentMethod)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardName, setCardName] = useState("")

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : value
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  const handleCardPayment = async () => {
    setIsProcessing(true)
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsProcessing(false)
    setIsSuccess(true)
    setTimeout(() => {
      onSuccess()
    }, 1500)
  }

  const handleQRPaymentComplete = () => {
    setIsSuccess(true)
    setTimeout(() => {
      onSuccess()
    }, 1500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {isSuccess ? "Payment Successful!" : "Complete Payment"}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center py-8"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20">
                <Check className="h-10 w-10 text-accent" />
              </div>
              <p className="mt-4 text-2xl font-bold">${amount.toFixed(2)}</p>
              <p className="mt-1 text-muted-foreground">Payment confirmed</p>
            </motion.div>
          ) : (
            <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-4 rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="text-3xl font-bold text-primary">${amount.toFixed(2)}</p>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "card" | "qr_code")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </TabsTrigger>
                  <TabsTrigger value="qr_code" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        className="pr-12"
                      />
                      <CreditCard className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        maxLength={3}
                        type="password"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 font-semibold"
                    onClick={handleCardPayment}
                    disabled={isProcessing || !cardNumber || !expiryDate || !cvv || !cardName}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${amount.toFixed(2)}`
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="qr_code" className="mt-4">
                  <QRCodeDisplay amount={amount} rideId={rideId} onPaymentComplete={handleQRPaymentComplete} />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
