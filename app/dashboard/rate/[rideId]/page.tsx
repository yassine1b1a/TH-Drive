import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { RateDriver } from "@/components/user/rate-driver"

export default async function RateDriverPage({ params }: { params: Promise<{ rideId: string }> }) {
  const { rideId } = await params
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

  const { data: ride } = await supabase
    .from("rides")
    .select("*, driver:profiles!rides_driver_id_fkey(*)")
    .eq("id", rideId)
    .single()

  if (!ride || ride.user_id !== user.id || ride.status !== "completed") {
    redirect("/dashboard/rides")
  }

  // Check if already rated
  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("ride_id", rideId)
    .eq("rater_id", user.id)
    .single()

  if (existingRating) {
    redirect("/dashboard/rides")
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
      <main className="flex min-h-screen items-center justify-center p-4 md:ml-64 md:p-8">
        <RateDriver
          rideId={rideId}
          raterId={user.id}
          ratedId={ride.driver_id!}
          driverName={ride.driver?.full_name || "Driver"}
        />
      </main>
    </div>
  )
}
