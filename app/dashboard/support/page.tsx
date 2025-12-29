import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { SupportChat } from "@/components/support/support-chat"

export default async function SupportPage() {
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
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Get help from our AI-powered support assistant</p>
        </div>
        <SupportChat userId={user.id} />
      </main>
    </div>
  )
}
