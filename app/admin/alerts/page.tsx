import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { AlertsTable } from "@/components/admin/alerts-table"

export default async function AdminAlertsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || !["admin", "moderator"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: alerts } = await supabase
    .from("moderation_alerts")
    .select("*, user:profiles!moderation_alerts_user_id_fkey(*)")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        user={{
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
        }}
      />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Moderation Alerts</h1>
          <p className="text-muted-foreground">Review automatically generated alerts</p>
        </div>
        <AlertsTable alerts={alerts || []} moderatorId={user.id} />
      </main>
    </div>
  )
}
