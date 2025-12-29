import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { UsersTable } from "@/components/admin/users-table"

export default async function AdminUsersPage() {
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

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "user")
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
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage rider accounts</p>
        </div>
        <UsersTable users={users || []} />
      </main>
    </div>
  )
}
