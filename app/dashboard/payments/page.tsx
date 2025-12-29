import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { PaymentHistory } from "@/components/payment/payment-history"

export default async function PaymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  const { data: rides } = await supabase
    .from("rides")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["completed", "pending", "in_progress"])
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          full_name: profile.full_name,
          email: profile.email,
          rating: profile.rating,
        }}
      />
      <main className="p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">View your payment history and manage payment methods</p>
        </div>
        <PaymentHistory rides={rides || []} />
      </main>
    </div>
  )
}
