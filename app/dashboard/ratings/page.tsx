import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star } from "lucide-react"

export default async function RatingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: ratings } = await supabase
    .from("ratings")
    .select("*")
    .eq("rated_id", user.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })

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
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Ratings</h1>
          <p className="text-muted-foreground">See what drivers think about you</p>
        </div>

        {/* Overall Rating */}
        <Card className="mb-8">
          <CardContent className="py-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-10 w-10 fill-yellow-400 text-yellow-400" />
              <span className="text-5xl font-bold">{profile.rating.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-muted-foreground">Overall Rating from {profile.total_rides} rides</p>
          </CardContent>
        </Card>

        {/* Rating History */}
        {ratings && ratings.length > 0 ? (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <Card key={rating.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < rating.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                {rating.comment && (
                  <CardContent>
                    <p className="text-muted-foreground">{rating.comment}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No ratings yet</h3>
              <p className="text-muted-foreground">Complete rides to receive ratings from drivers.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
