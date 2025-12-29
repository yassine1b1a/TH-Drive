"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Flag, CheckCircle, AlertTriangle, Ban, XCircle } from "lucide-react"
import type { Violation, Profile } from "@/lib/types"

interface ViolationWithUsers extends Violation {
  user: Profile
  reporter: Profile | null
}

interface ViolationsTableProps {
  violations: ViolationWithUsers[]
  moderatorId: string
}

export function ViolationsTable({ violations: initialViolations, moderatorId }: ViolationsTableProps) {
  const [violations, setViolations] = useState(initialViolations)
  const [selectedViolation, setSelectedViolation] = useState<ViolationWithUsers | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    reviewed: "bg-blue-100 text-blue-800",
    warning_issued: "bg-orange-100 text-orange-800",
    ban_issued: "bg-red-100 text-red-800",
    dismissed: "bg-gray-100 text-gray-800",
  }

  const handleReview = async (violation: ViolationWithUsers, action: "warning_issued" | "ban_issued" | "dismissed") => {
    setIsProcessing(true)
    try {
      const supabase = createClient()

      await supabase
        .from("violations")
        .update({
          status: action,
          reviewed_by: moderatorId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", violation.id)

      // This triggers the database trigger to handle warnings/bans
      setViolations(
        violations.map((v) => (v.id === violation.id ? { ...v, status: action, reviewed_by: moderatorId } : v)),
      )
      setIsReviewDialogOpen(false)
    } catch (error) {
      console.error("Error reviewing violation:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const pendingViolations = violations.filter((v) => v.status === "pending")
  const resolvedViolations = violations.filter((v) => v.status !== "pending")

  return (
    <>
      <div className="space-y-6">
        {/* Pending Violations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Pending Violations ({pendingViolations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingViolations.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No pending violations</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingViolations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{violation.user?.full_name || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">{violation.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{violation.violation_type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{violation.description || "No description"}</TableCell>
                      <TableCell>{violation.reporter?.full_name || "System"}</TableCell>
                      <TableCell>{new Date(violation.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedViolation(violation)
                            setIsReviewDialogOpen(true)
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Resolved Violations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resolved Violations ({resolvedViolations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedViolations.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No resolved violations</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resolved Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedViolations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>{violation.user?.full_name || violation.user?.email}</TableCell>
                      <TableCell>{violation.violation_type.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[violation.status]}>{violation.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        {violation.reviewed_at ? new Date(violation.reviewed_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Violation</DialogTitle>
            <DialogDescription>
              Review the violation for {selectedViolation?.user?.full_name || selectedViolation?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Violation Type</p>
              <p className="text-sm text-muted-foreground">{selectedViolation?.violation_type.replace("_", " ")}</p>
              <p className="mt-2 text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground">
                {selectedViolation?.description || "No description provided"}
              </p>
              <p className="mt-2 text-sm font-medium">Current Warnings</p>
              <p className="text-sm text-muted-foreground">{selectedViolation?.user?.warnings_count || 0}</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => selectedViolation && handleReview(selectedViolation, "dismissed")}
              disabled={isProcessing}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Dismiss
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedViolation && handleReview(selectedViolation, "warning_issued")}
              disabled={isProcessing}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Issue Warning
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedViolation && handleReview(selectedViolation, "ban_issued")}
              disabled={isProcessing}
            >
              <Ban className="mr-1 h-4 w-4" />
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
