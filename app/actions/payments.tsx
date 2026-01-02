// app/actions/payments.ts
'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function handleCashPenalty(driverId: string, rideId: string, amount: number) {
  const supabase = await createClient()
  const commission = amount * 0.05

  // Check if driver has wallet balance
  const { data: driver } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', driverId)
    .single()

  if (driver && driver.wallet_balance >= commission) {
    // Deduct from wallet
    await supabase.rpc('update_wallet_balance', {
      user_id: driverId,
      amount: -commission
    })

    // Add to admin
    await supabase.rpc('add_admin_commission', {
      amount: commission
    })

    // Send notification
    await supabase.from('notifications').insert({
      user_id: driverId,
      title: 'Commission Paid',
      message: `$${commission.toFixed(2)} commission deducted from your wallet for cash ride.`,
      type: 'info'
    })
  } else {
    // Add penalty
    await supabase
      .from('driver_details')
      .update({
        pending_penalties: (await supabase.from('driver_details').select('pending_penalties').eq('user_id', driverId).single()).data?.pending_penalties + commission,
        penalty_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .eq('user_id', driverId)

    // Send warning notification
    await supabase.from('notifications').insert({
      user_id: driverId,
      title: 'Commission Due',
      message: `Pay $${commission.toFixed(2)} commission within 24 hours or risk account suspension.`,
      type: 'warning',
      metadata: { deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
    })
  }

  revalidatePath('/driver')
}

// Add other payment-related server actions here
export async function processQRPayment(qrCode: string, driverId: string) {
  const supabase = await createClient()
  
  // Verify QR code
  const { data: qrData, error } = await supabase
    .from('qr_codes')
    .select('*, ride:rides(*)')
    .eq('code', qrCode)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !qrData) {
    throw new Error('Invalid or expired QR code')
  }

  const commission = qrData.amount * 0.05
  const driverEarnings = qrData.amount * 0.95

  // Process payment
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      ride_id: qrData.ride_id,
      user_id: qrData.user_id,
      driver_id: driverId,
      amount: qrData.amount,
      commission: commission,
      driver_earnings: driverEarnings,
      payment_method: 'qr_code',
      status: 'completed',
      from_wallet: true,
      qr_code_id: qrData.id,
      qr_scanned_at: new Date().toISOString()
    })
    .select()
    .single()

  // Mark QR as used
  await supabase
    .from('qr_codes')
    .update({ is_used: true, scanned_by: driverId })
    .eq('id', qrData.id)

  // Update driver earnings
  await supabase.rpc('increment_driver_earnings', {
    driver_id: driverId,
    amount: driverEarnings
  })

  // Deduct from user wallet
  await supabase.rpc('update_wallet_balance', {
    user_id: qrData.user_id,
    amount: -qrData.amount
  })

  // Add commission to admin
  await supabase.rpc('add_commission_to_admin', {
    transaction_id: transaction.id,
    amount: commission
  })

  revalidatePath('/driver')
  return { success: true, amount: qrData.amount }
}

export async function topUpWallet(userId: string, amount: number, paymentMethod: string) {
  const supabase = await createClient()
  
  // In production: Process actual payment with Stripe/Paymob
  // For now, just update wallet
  await supabase.rpc('update_wallet_balance', {
    user_id: userId,
    amount: amount
  })

  // Create transaction record
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      amount: amount,
      commission: 0,
      driver_earnings: 0,
      payment_method: paymentMethod,
      status: 'completed'
    })

  revalidatePath('/dashboard')
  return { success: true }
}
