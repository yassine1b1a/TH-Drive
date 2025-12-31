import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { DriversTable } from "@/components/admin/drivers-table"

export default async function AdminDriversPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "moderator"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: drivers } = await supabase
    .from("profiles")
    .select("*, driver_details(*)")
    .eq("role", "driver")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
       <AdminSidebar
          user={{
            full_name: profile.full_name || "Admin",
            email: profile.email || "",
            role: profile.role,
          }}
        />
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Drivers</h1>
          <p className="text-muted-foreground">Manage driver accounts and verification</p>
        </div>
        <DriversTable drivers={drivers || []} />
      </main>
    </div>
  )
}
