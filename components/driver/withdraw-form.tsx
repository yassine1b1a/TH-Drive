// components/driver/withdraw-form.tsx
'use client'

import { useState } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, CreditCard, Banknote, Smartphone, AlertCircle } from "lucide-react" // Changed Paypal to CreditCard
import { toast } from "sonner"

export function WithdrawForm({ availableBalance }: { availableBalance: number }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('paypal')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [processing, setProcessing] = useState(false)

  const minWithdrawal = 20 // Minimum withdrawal amount

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount)
    
    if (!withdrawAmount || withdrawAmount < minWithdrawal) {
      toast.error(`Minimum withdrawal is $${minWithdrawal}`)
      return
    }

    if (withdrawAmount > availableBalance) {
      toast.error("Insufficient balance")
      return
    }

    if (method === 'paypal' && !paypalEmail.includes('@')) {
      toast.error("Please enter a valid PayPal email")
      return
    }

    setProcessing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Create withdrawal request
      const { error } = await supabase.from('withdrawals').insert({
        driver_id: user?.id,
        amount: withdrawAmount,
        method: method,
        paypal_email: method === 'paypal' ? paypalEmail : null,
        status: 'pending'
      })

      if (error) throw error

      // Deduct from available balance (will be added back if rejected)
      await supabase.rpc('update_driver_balance', {
        driver_id: user?.id,
        amount: -withdrawAmount
      })

      toast.success(`Withdrawal request for $${withdrawAmount.toFixed(2)} submitted`)
      setAmount('')
      setPaypalEmail('')
    } catch (error) {
      toast.error("Failed to submit withdrawal request")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw Earnings</CardTitle>
        <CardDescription>Available balance: ${availableBalance.toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount */}
        <div className="space-y-3">
          <Label htmlFor="amount">Amount to Withdraw</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              min={minWithdrawal}
              max={availableBalance}
              step="0.01"
              placeholder={`Minimum $${minWithdrawal}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => setAmount((availableBalance * 0.5).toFixed(2))}
              className="text-primary hover:underline"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setAmount(availableBalance.toFixed(2))}
              className="text-primary hover:underline"
            >
              100%
            </button>
          </div>
        </div>

        {/* Method */}
        <div className="space-y-3">
          <Label>Withdrawal Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paypal">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> {/* Changed icon */}
                  PayPal
                </div>
              </SelectItem>
              <SelectItem value="bank_transfer">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Bank Transfer
                </div>
              </SelectItem>
              <SelectItem value="vodafone_cash">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Vodafone Cash
                </div>
              </SelectItem>
              <SelectItem value="orange_money">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Orange Money
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* PayPal Email */}
        {method === 'paypal' && (
          <div className="space-y-3">
            <Label htmlFor="paypal">PayPal Email</Label>
            <Input
              id="paypal"
              type="email"
              placeholder="email@example.com"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
            />
          </div>
        )}

        {/* Bank Details */}
        {method === 'bank_transfer' && (
          <div className="space-y-3">
            <Label>Bank Details Required</Label>
            <div className="rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-900">
              <p className="text-yellow-800 dark:text-yellow-200">
                Please add your bank details in your profile settings first.
              </p>
            </div>
          </div>
        )}

        {/* Mobile Wallet */}
        {(method === 'vodafone_cash' || method === 'orange_money') && (
          <div className="space-y-3">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
            />
          </div>
        )}

        {/* Terms */}
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Processing Information:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Withdrawals processed within 3-5 business days</li>
                <li>2% processing fee for amounts under $100</li>
                <li>Minimum withdrawal: ${minWithdrawal}</li>
                <li>Taxes may apply based on your location</li>
              </ul>
            </div>
          </div>
        </div>

        <Button onClick={handleWithdraw} disabled={processing || !amount} className="w-full">
          {processing ? "Processing..." : "Request Withdrawal"}
        </Button>
      </CardContent>
    </Card>
  )
}
