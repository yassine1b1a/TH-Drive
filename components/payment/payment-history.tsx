"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, QrCode, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react"

interface Ride {
  id: string
  fare: number | null
  payment_method: string
  payment_status: string
  status: string
  created_at: string
  pickup_address: string
  dropoff_address: string
}

interface PaymentHistoryProps {
  rides: Ride[]
}

export function PaymentHistory({ rides }: PaymentHistoryProps) {
  const totalSpent = rides.filter((r) => r.payment_status === "paid").reduce((sum, r) => sum + (r.fare || 0), 0)

  const pendingPayments = rides.filter((r) => r.payment_status === "pending" && r.status !== "cancelled")

  const paidRides = rides.filter((r) => r.payment_status === "paid")

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{paidRides.length} completed payments</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayments.length}</div>
              <p className="text-xs text-muted-foreground">
                ${pendingPayments.reduce((sum, r) => sum + (r.fare || 0), 0).toFixed(2)} pending
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Fare</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${paidRides.length > 0 ? (totalSpent / paidRides.length).toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Per ride</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {rides.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">No payment history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((ride, index) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        ride.payment_method === "card" ? "bg-primary/10" : "bg-accent/10"
                      }`}
                    >
                      {ride.payment_method === "card" ? (
                        <CreditCard className="h-5 w-5 text-primary" />
                      ) : (
                        <QrCode className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{ride.dropoff_address}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ride.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={ride.payment_status === "paid" ? "default" : "secondary"}
                      className={ride.payment_status === "paid" ? "bg-accent text-accent-foreground" : ""}
                    >
                      {ride.payment_status === "paid" ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {ride.payment_status}
                    </Badge>
                    <span className="font-bold">${(ride.fare || 0).toFixed(2)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
