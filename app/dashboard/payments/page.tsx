"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Wallet, DollarSign, Download } from "lucide-react"

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number
}

interface Payment {
  id: string
  amount: number
  status: "completed" | "pending" | "failed"
  date: string
  description: string
}

export default function PaymentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email, rating")
          .eq("id", user.id)
          .single()
        
        setProfile(profileData)
        
        // Fetch payments (mock data for now)
        const mockPayments: Payment[] = [
          {
            id: "1",
            amount: 25.50,
            status: "completed",
            date: "2024-01-15",
            description: "Ride to Airport"
          },
          {
            id: "2",
            amount: 18.75,
            status: "completed",
            date: "2024-01-10",
            description: "Ride to Downtown"
          },
          {
            id: "3",
            amount: 32.00,
            status: "pending",
            date: "2024-01-20",
            description: "Ride to Suburbs"
          },
        ]
        setPayments(mockPayments)
      }
      setLoading(false)
    }
    
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p>You need to be logged in to view this page.</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalSpent = payments
    .filter(p => p.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0)

  const pendingAmount = payments
    .filter(p => p.status === "pending")
    .reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          id: profile.id, // Add the id property here
          full_name: profile.full_name || "User",
          email: profile.email || "",
          rating: profile.rating || 5.0,
        }}
      />
      
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage your payments and view transaction history</p>
        </div>

        {/* Payment Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All completed payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">Card on file</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>View all your ride payments and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payment history found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Payment Method */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Add or manage your payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
                <Badge variant="outline">Default</Badge>
              </div>
              
              <Button className="w-full">Add New Payment Method</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
