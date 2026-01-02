// components/wallet/topup-form.tsx
'use client'

import { useState } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, Smartphone, DollarSign, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function WalletTopupForm({ currentBalance, onSuccess }: { currentBalance: number; onSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [processing, setProcessing] = useState(false)

  const presetAmounts = [10, 50, 100, 200, 500]

  const handleTopup = async () => {
    if (!amount || parseFloat(amount) < 1) {
      toast.error("Please enter a valid amount")
      return
    }

    setProcessing(true)
    try {
      const supabase = createClient()

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In real app: Process payment with Stripe/Paymob
      // Then update wallet balance
      const { error } = await supabase.rpc('update_wallet_balance', {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        amount: parseFloat(amount)
      })

      if (error) throw error

      toast.success(`Successfully added $${amount} to your wallet`)
      setAmount('')
      onSuccess()
    } catch (error) {
      toast.error("Failed to process payment")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Up Wallet</CardTitle>
        <CardDescription>Current balance: ${currentBalance.toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Amounts */}
        <div className="space-y-3">
          <Label>Quick Top-up</Label>
          <div className="grid grid-cols-3 gap-2">
            {presetAmounts.map((amt) => (
              <Button
                key={amt}
                type="button"
                variant="outline"
                onClick={() => setAmount(amt.toString())}
                className={amount === amt.toString() ? 'border-primary' : ''}
              >
                ${amt}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="space-y-3">
          <Label htmlFor="amount">Custom Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label>Payment Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit/Debit Card
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Wallet
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Terms */}
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">Important:</p>
          <ul className="mt-1 list-disc pl-4 space-y-1">
            <li>5% commission deducted on each ride</li>
            <li>For cash payments, you must pay commission within 24 hours</li>
            <li>Wallet funds are non-refundable</li>
          </ul>
        </div>

        <Button onClick={handleTopup} disabled={processing} className="w-full">
          {processing ? "Processing..." : `Add $${amount || "0"} to Wallet`}
        </Button>
      </CardContent>
    </Card>
  )
}
