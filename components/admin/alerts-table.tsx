// In dashboard/notification/page.tsx (the moderator page)
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, CheckCircle, Ban, Star } from "lucide-react"
import { sendWarningNotification, sendBanNotification } from "@/lib/notifications"

// Define types locally if not imported
interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number
  warnings_count: number
  is_banned: boolean
}

interface ModerationAlert {
  id: string
  user_id: string
  alert_type: string
  description: string
  status: string
  reviewed_by: string | null
  action_taken: string | null
  created_at: string
  reviewed_at: string | null
}

interface Alert extends ModerationAlert {
  user: Profile
}

interface AlertsTableProps {
  alerts: Alert[]
  moderatorId: string
}

export function AlertsTable({ alerts: initialAlerts, moderatorId }: AlertsTableProps) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [actionTaken, setActionTaken] = useState("")
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    reviewed: "bg-blue-100 text-blue-800",
    actioned: "bg-green-100 text-green-800",
  }

  const handleReview = async (alert: Alert, action: "warn" | "ban" | "dismiss") => {
    setIsProcessing(true)
    try {
      const supabase = createClient()

      // Get moderator info
      const { data: moderatorData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", moderatorId)
        .single()

      const moderatorName = moderatorData?.full_name || "Moderator"

      // Update alert
      await supabase
        .from("moderation_alerts")
        .update({
          status: "actioned",
          reviewed_by: moderatorId,
          reviewed_at: new Date().toISOString(),
          action_taken: action,
        })
        .eq("id", alert.id)

      // Take action on user and send notification
      if (action === "warn") {
        await supabase
          .from("profiles")
          .update({ warnings_count: alert.user.warnings_count + 1 })
          .eq("id", alert.user_id)

        // Send warning notification to user
        await sendWarningNotification(
          alert.user_id,
          actionTaken || `Low rating alert: ${alert.description}`,
          moderatorName,
          alert.id
        )
      } else if (action === "ban") {
        await supabase
          .from("profiles")
          .update({ 
            is_banned: true, 
            ban_reason: actionTaken || `Low rating alert: ${alert.description}` 
          })
          .eq("id", alert.user_id)

        // Send ban notification to user
        await sendBanNotification(
          alert.user_id,
          actionTaken || `Low rating alert: ${alert.description}`,
          moderatorName,
          alert.id
        )
      } else if (action === "dismiss") {
        // Just update the alert status without sending notification
        // Or send an info notification if desired
      }

      setAlerts(
        alerts.map((a) =>
          a.id === alert.id ? { ...a, status: "actioned", reviewed_by: moderatorId, action_taken: action } : a,
        ),
      )
      setIsActionDialogOpen(false)
      setActionTaken("")
    } catch (error) {
      console.error("Error reviewing alert:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const pendingAlerts = alerts.filter((a) => a.status === "pending")
  const resolvedAlerts = alerts.filter((a) => a.status !== "pending")

  return (
    <>
      <div className="space-y-6">
        {/* Pending Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Alerts ({pendingAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingAlerts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No pending alerts</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Alert Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.user?.full_name || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">{alert.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors.pending}>{alert.alert_type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{alert.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {alert.user?.rating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleReview(alert, "dismiss")}>
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAlert(alert)
                              setIsActionDialogOpen(true)
                            }}
                          >
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Resolved Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resolved Alerts ({resolvedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedAlerts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No resolved alerts</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Alert Type</TableHead>
                    <TableHead>Action Taken</TableHead>
                    <TableHead>Resolved Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.user?.full_name || alert.user?.email}</TableCell>
                      <TableCell>{alert.alert_type.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[alert.status]}>{alert.action_taken || alert.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {alert.reviewed_at ? new Date(alert.reviewed_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Alert</DialogTitle>
            <DialogDescription>
              Take action for {selectedAlert?.user?.full_name || selectedAlert?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Alert Details</p>
              <p className="text-sm text-muted-foreground">{selectedAlert?.description}</p>
              <div className="mt-2 flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">Current rating: {selectedAlert?.user?.rating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Warnings: {selectedAlert?.user?.warnings_count}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionNote">Action note (optional)</Label>
              <Textarea
                id="actionNote"
                placeholder="Add a note about the action taken..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedAlert && handleReview(selectedAlert, "warn")}
              disabled={isProcessing}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Issue Warning
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAlert && handleReview(selectedAlert, "ban")}
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
