"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Star, Ban, CheckCircle, Search, Car, AlertTriangle, MessageSquareWarning } from "lucide-react"
import { toast } from "sonner"

interface Driver {
  id: string
  full_name: string | null
  email: string
  rating: number | null
  is_banned: boolean | null
  ban_reason: string | null
  warnings_count: number | null
  created_at: string
  driver_details: Array<{
    id: string
    license_number: string
    vehicle_make: string
    vehicle_model: string
    vehicle_color: string
    vehicle_plate: string
    is_verified: boolean
  }> | null
}

interface DriversTableProps {
  drivers: Driver[]
}

export function DriversTable({ drivers: initialDrivers }: DriversTableProps) {
  // Filter out drivers with null or empty driver_details
  const [drivers, setDrivers] = useState<Driver[]>(
    initialDrivers.filter(driver => driver.driver_details && driver.driver_details.length > 0)
  )
  const [search, setSearch] = useState("")
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [banReason, setBanReason] = useState("")
  const [warnReason, setWarnReason] = useState("")
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [isWarnDialogOpen, setIsWarnDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      driver.email.toLowerCase().includes(search.toLowerCase()),
  )

  const handleVerify = async (driver: Driver) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      const driverDetails = driver.driver_details?.[0]
      if (!driverDetails) {
        toast.error("Driver details not found")
        return
      }

      await supabase.from("driver_details").update({ is_verified: true }).eq("id", driverDetails.id)

      setDrivers(
        drivers.map((d) =>
          d.id === driver.id ? { 
            ...d, 
            driver_details: [{ ...driverDetails, is_verified: true }] 
          } : d,
        ),
      )
      toast.success("Driver verified successfully")
    } catch (error) {
      console.error("Error verifying driver:", error)
      toast.error("Failed to verify driver")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBan = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)

    try {
      const supabase = createClient()
      
      // Ban the driver
      await supabase
        .from("profiles")
        .update({
          is_banned: true,
          ban_reason: banReason,
        })
        .eq("id", selectedDriver.id)

      // Send notification to driver
      await supabase
        .from("notifications")
        .insert({
          user_id: selectedDriver.id,
          title: "Account Banned",
          message: `Your account has been banned. Reason: ${banReason}`,
          type: "alert",
          metadata: { action: "ban", admin_action: true },
        })

      setDrivers(
        drivers.map((d) => (d.id === selectedDriver.id ? { ...d, is_banned: true, ban_reason: banReason } : d)),
      )
      
      toast.success(`Driver ${selectedDriver.full_name || selectedDriver.email} has been banned`)
      setIsBanDialogOpen(false)
      setBanReason("")
    } catch (error) {
      console.error("Error banning driver:", error)
      toast.error("Failed to ban driver")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWarn = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)

    try {
      const supabase = createClient()
      const currentWarnings = selectedDriver.warnings_count || 0
      
      // Update warnings count
      await supabase
        .from("profiles")
        .update({
          warnings_count: currentWarnings + 1,
        })
        .eq("id", selectedDriver.id)

      // Send notification to driver
      await supabase
        .from("notifications")
        .insert({
          user_id: selectedDriver.id,
          title: "Warning Issued",
          message: `You have received a warning. Reason: ${warnReason}`,
          type: "warning",
          metadata: { action: "warn", warning_count: currentWarnings + 1, admin_action: true },
        })

      setDrivers(
        drivers.map((d) =>
          d.id === selectedDriver.id ? { ...d, warnings_count: (d.warnings_count || 0) + 1 } : d,
        ),
      )
      
      toast.success(`Warning issued to ${selectedDriver.full_name || selectedDriver.email}`)
      setIsWarnDialogOpen(false)
      setWarnReason("")
    } catch (error) {
      console.error("Error warning driver:", error)
      toast.error("Failed to issue warning")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnban = async (driverId: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      
      // Unban the driver
      await supabase
        .from("profiles")
        .update({
          is_banned: false,
          ban_reason: null,
        })
        .eq("id", driverId)

      // Send notification to driver
      await supabase
        .from("notifications")
        .insert({
          user_id: driverId,
          title: "Account Unbanned",
          message: "Your account has been unbanned and you can now accept rides again.",
          type: "success",
          metadata: { action: "unban", admin_action: true },
        })

      setDrivers(drivers.map((d) => (d.id === driverId ? { ...d, is_banned: false, ban_reason: null } : d)))
      
      const driver = drivers.find(d => d.id === driverId)
      toast.success(`Driver ${driver?.full_name || driver?.email} has been unbanned`)
    } catch (error) {
      console.error("Error unbanning driver:", error)
      toast.error("Failed to unban driver")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Drivers ({drivers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map((driver) => {
                const details = driver.driver_details?.[0]
                return (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{driver.full_name || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">{driver.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {details ? (
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {details.vehicle_color} {details.vehicle_make} {details.vehicle_model}
                          </span>
                        </div>
                      ) : (
                        "No vehicle info"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {(driver.rating || 5.0).toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.warnings_count && driver.warnings_count > 0 ? (
                        <Badge variant="outline" className="text-orange-600">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {driver.warnings_count} warning(s)
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {details?.is_verified ? (
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.is_banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {details && !details.is_verified && !driver.is_banned && (
                          <Button variant="outline" size="sm" onClick={() => handleVerify(driver)}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verify
                          </Button>
                        )}
                        {!driver.is_banned && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDriver(driver)
                              setIsWarnDialogOpen(true)
                            }}
                            className="text-orange-600"
                          >
                            <MessageSquareWarning className="mr-1 h-3 w-3" />
                            Warn
                          </Button>
                        )}
                        {!driver.is_banned ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedDriver(driver)
                              setIsBanDialogOpen(true)
                            }}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Ban
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleUnban(driver.id)}>
                            Unban
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban Driver</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedDriver?.full_name || selectedDriver?.email}? They will no longer be
              able to accept rides.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banReason">Reason for ban</Label>
              <Textarea
                id="banReason"
                placeholder="Enter the reason for banning this driver..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={isProcessing || !banReason.trim()}>
              {isProcessing ? "Banning..." : "Ban Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={isWarnDialogOpen} onOpenChange={setIsWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warn Driver</DialogTitle>
            <DialogDescription>
              Issue a warning to {selectedDriver?.full_name || selectedDriver?.email}. Multiple warnings may lead to a ban.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warnReason">Reason for warning</Label>
              <Textarea
                id="warnReason"
                placeholder="Enter the reason for warning this driver..."
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                required
              />
            </div>
            {selectedDriver && selectedDriver.warnings_count && selectedDriver.warnings_count > 0 && (
              <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  This driver already has {selectedDriver.warnings_count} warning(s).
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWarnDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              className="bg-orange-50 text-orange-700 hover:bg-orange-100"
              onClick={handleWarn} 
              disabled={isProcessing || !warnReason.trim()}
            >
              {isProcessing ? "Issuing..." : "Issue Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
