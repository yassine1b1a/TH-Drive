"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { Profile, DriverDetails } from "@/lib/types"

interface DriverSettingsProps {
  profile: Profile
  driverDetails: DriverDetails | null
}

export function DriverSettings({ profile, driverDetails }: DriverSettingsProps) {
  const [fullName, setFullName] = useState(profile.full_name || "")
  const [phone, setPhone] = useState(profile.phone || "")
  const [vehicleMake, setVehicleMake] = useState(driverDetails?.vehicle_make || "")
  const [vehicleModel, setVehicleModel] = useState(driverDetails?.vehicle_model || "")
  const [vehicleColor, setVehicleColor] = useState(driverDetails?.vehicle_color || "")
  const [vehiclePlate, setVehiclePlate] = useState(driverDetails?.vehicle_plate || "")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    setIsSaving(true)
    setMessage("")

    try {
      const supabase = createClient()

      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      // Update driver details
      if (driverDetails) {
        await supabase
          .from("driver_details")
          .update({
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_color: vehicleColor,
            vehicle_plate: vehiclePlate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", driverDetails.id)
      }

      setMessage("Settings saved successfully!")
    } catch (error) {
      console.error("Error saving settings:", error)
      setMessage("Error saving settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleMake">Make</Label>
              <Input id="vehicleMake" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Model</Label>
              <Input id="vehicleModel" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleColor">Color</Label>
              <Input id="vehicleColor" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">License Plate</Label>
              <Input id="vehiclePlate" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {message && (
        <p className={`text-sm ${message.includes("Error") ? "text-destructive" : "text-green-600"}`}>{message}</p>
      )}

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save Changes
      </Button>
    </div>
  )
}
