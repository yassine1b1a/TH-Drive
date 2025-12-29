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
import { Star, Ban, AlertTriangle, Search } from "lucide-react"
import type { Profile } from "@/lib/types"

interface UsersTableProps {
  users: Profile[]
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [banReason, setBanReason] = useState("")
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [isWarnDialogOpen, setIsWarnDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()),
  )

  const handleBan = async () => {
    if (!selectedUser) return
    setIsProcessing(true)

    try {
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({
          is_banned: true,
          ban_reason: banReason,
        })
        .eq("id", selectedUser.id)

      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, is_banned: true, ban_reason: banReason } : u)))
      setIsBanDialogOpen(false)
      setBanReason("")
    } catch (error) {
      console.error("Error banning user:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnban = async (userId: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({
          is_banned: false,
          ban_reason: null,
        })
        .eq("id", userId)

      setUsers(users.map((u) => (u.id === userId ? { ...u, is_banned: false, ban_reason: null } : u)))
    } catch (error) {
      console.error("Error unbanning user:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWarn = async () => {
    if (!selectedUser) return
    setIsProcessing(true)

    try {
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({
          warnings_count: selectedUser.warnings_count + 1,
        })
        .eq("id", selectedUser.id)

      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, warnings_count: u.warnings_count + 1 } : u)))
      setIsWarnDialogOpen(false)
    } catch (error) {
      console.error("Error warning user:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users ({users.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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
                <TableHead>Email</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {user.rating.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.warnings_count > 0 && (
                      <Badge variant="outline" className="text-yellow-600">
                        {user.warnings_count} warning(s)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!user.is_banned ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsWarnDialogOpen(true)
                            }}
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Warn
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsBanDialogOpen(true)
                            }}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Ban
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleUnban(user.id)}>
                          Unban
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedUser?.full_name || selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banReason">Reason for ban</Label>
              <Textarea
                id="banReason"
                placeholder="Enter the reason for banning this user..."
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
              {isProcessing ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={isWarnDialogOpen} onOpenChange={setIsWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warn User</DialogTitle>
            <DialogDescription>
              Issue a warning to {selectedUser?.full_name || selectedUser?.email}? This user currently has{" "}
              {selectedUser?.warnings_count || 0} warning(s).
              {selectedUser?.warnings_count === 2 && (
                <span className="mt-2 block font-semibold text-destructive">
                  This will be their 3rd warning and will result in an automatic ban!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWarnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWarn} disabled={isProcessing}>
              {isProcessing ? "Warning..." : "Issue Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
