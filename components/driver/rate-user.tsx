"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, Loader2 } from "lucide-react"

interface RateUserProps {
  rideId: string
  raterId: string
  ratedId: string
  ratedName: string
}

export function RateUser({ rideId, raterId, ratedId, ratedName }: RateUserProps) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isHidden, setIsHidden] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()

      await supabase.from("ratings").insert({
        ride_id: rideId,
        rater_id: raterId,
        rated_id: ratedId,
        rating,
        comment: comment || null,
        is_hidden: isHidden,
      })

      router.push("/driver")
    } catch (error) {
      console.error("Error submitting rating:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    router.push("/driver")
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Rate {ratedName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Star Rating */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-10 w-10 ${
                  star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">Comment (optional)</Label>
          <Textarea
            id="comment"
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Hidden Rating Option */}
        <div className="flex items-center space-x-2">
          <Checkbox id="hidden" checked={isHidden} onCheckedChange={(checked) => setIsHidden(checked as boolean)} />
          <Label htmlFor="hidden" className="text-sm text-muted-foreground">
            Keep this rating private (only visible to moderators)
          </Label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={handleSkip}>
            Skip
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Rating
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
