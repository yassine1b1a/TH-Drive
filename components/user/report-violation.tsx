"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Flag, Loader2 } from "lucide-react"

interface ReportViolationProps {
  reporterId: string
  reportedUserId: string
  rideId?: string
  reportedUserName: string
}

export function ReportViolation({ reporterId, reportedUserId, rideId, reportedUserName }: ReportViolationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [violationType, setViolationType] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const violationTypes = [
    { value: "late_arrival", label: "Late Arrival" },
    { value: "wrong_location", label: "Wrong Location" },
    { value: "misconduct", label: "Misconduct" },
    { value: "unsafe_driving", label: "Unsafe Driving" },
    { value: "cancellation", label: "Unexpected Cancellation" },
    { value: "other", label: "Other" },
  ]

  const handleSubmit = async () => {
    if (!violationType) return
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      await supabase.from("violations").insert({
        user_id: reportedUserId,
        reported_by: reporterId,
        ride_id: rideId || null,
        violation_type: violationType,
        description: description || null,
        status: "pending",
      })

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setViolationType("")
        setDescription("")
      }, 2000)
    } catch (error) {
      console.error("Error reporting violation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive bg-transparent">
          <Flag className="mr-1 h-4 w-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        {submitted ? (
          <div className="py-8 text-center">
            <Flag className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">Report Submitted</h3>
            <p className="text-muted-foreground">Our moderation team will review your report.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report {reportedUserName}</DialogTitle>
              <DialogDescription>
                Help us maintain a safe community by reporting violations. Our team will review your report.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="violationType">Violation Type</Label>
                <Select value={violationType} onValueChange={setViolationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a violation type" />
                  </SelectTrigger>
                  <SelectContent>
                    {violationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe what happened..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!violationType || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
