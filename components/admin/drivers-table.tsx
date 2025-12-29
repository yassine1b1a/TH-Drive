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
import { Star, Ban, CheckCircle, Search, Car } from "lucide-react"
import type { Profile, DriverDetails } from "@/lib/types"

interface Driver extends Profile {
  driver_details: DriverDetails[]
}

interface DriversTableProps {
  drivers: Driver[]
}

export function DriversTable({ drivers: initialDrivers }: DriversTableProps) {
  const [drivers, setDrivers] = useState(initialDrivers)
  const [search, setSearch] = useState("")
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [banReason, setBanReason] = useState("")
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
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
      const driverDetails = driver.driver_details[0]
      if (!driverDetails) return

      await supabase.from("driver_details").update({ is_verified: true }).eq("id", driverDetails.id)

      setDrivers(
        drivers.map((d) =>
          d.id === driver.id ? { ...d, driver_details: [{ ...driverDetails, is_verified: true }] } : d,
        ),
      )
    } catch (error) {
      console.error("Error verifying driver:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBan = async () => {
    if (!selectedDriver) return
    setIsProcessing(true)

    try {
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({
          is_banned: true,
          ban_reason: banReason,
        })
        .eq("id", selectedDriver.id)

      setDrivers(
        drivers.map((d) => (d.id === selectedDriver.id ? { ...d, is_banned: true, ban_reason: banReason } : d)),
      )
      setIsBanDialogOpen(false)
      setBanReason("")
    } catch (error) {
      console.error("Error banning driver:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnban = async (driverId: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({
          is_banned: false,
          ban_reason: null,
        })
        .eq("id", driverId)

      setDrivers(drivers.map((d) => (d.id === driverId ? { ...d, is_banned: false, ban_reason: null } : d)))
    } catch (error) {
      console.error("Error unbanning driver:", error)
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
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map((driver) => {
                const details = driver.driver_details[0]
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
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {driver.rating.toFixed(1)}
                      </div>
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
                        {!details?.is_verified && !driver.is_banned && (
                          <Button variant="outline" size="sm" onClick={() => handleVerify(driver)}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verify
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={isProcessing}>
              {isProcessing ? "Banning..." : "Ban Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
