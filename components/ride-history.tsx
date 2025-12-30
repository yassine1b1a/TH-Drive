"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Filter,
  Search,
  Loader2,
  Car,
  User,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  Navigation,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  CalendarDays,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { calculateDistance } from "@/lib/ride/calculations"

interface Ride {
  id: string
  user_id: string
  driver_id: string | null
  status: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string | null
  dropoff_lat: number
  dropoff_lng: number
  dropoff_address: string | null
  distance_km: number | null
  estimated_duration_min: number | null
  fare: number | null
  payment_method: string | null
  payment_status: string
  ride_type: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  user?: {
    full_name: string | null
    email: string
    phone: string | null
    rating: number | null
  }
  driver?: {
    full_name: string | null
    email: string
    phone: string | null
    rating: number | null
    vehicle_make: string | null
    vehicle_model: string | null
    vehicle_plate: string | null
  }
  rating?: {
    rating: number
    comment: string | null
    created_at: string
  }
}

interface RideHistoryProps {
  userId: string
  role: "user" | "driver"
}

const ITEMS_PER_PAGE = 10

export function RideHistory({ userId, role }: RideHistoryProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    averageRating: 0,
    completedRides: 0,
  })

  useEffect(() => {
    loadRides()
  }, [userId, role])

  const loadRides = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      let query = supabase
        .from("rides")
        .select(`
          *,
          user:profiles!rides_user_id_fkey (
            full_name,
            email,
            phone,
            rating
          ),
          driver:profiles!rides_driver_id_fkey (
            full_name,
            email,
            phone,
            rating
          ),
          ratings!left (
            rating,
            comment,
            created_at
          )
        `)
        .order("created_at", { ascending: false })

      // Filter by user role
      if (role === "driver") {
        query = query.eq("driver_id", userId)
      } else {
        query = query.eq("user_id", userId)
      }

      const { data, error } = await query

      if (error) throw error

      const ridesData = data || []
      setRides(ridesData as Ride[])

      // Calculate stats
      const totalRides = ridesData.length
      const completedRides = ridesData.filter(r => r.status === "completed").length
      const totalEarnings = ridesData
        .filter(r => r.status === "completed" && r.fare)
        .reduce((sum, ride) => sum + (ride.fare || 0), 0)
      
      // Calculate average rating
      const ratings = ridesData
        .filter(r => r.ratings)
        .map(r => r.ratings?.rating || 0)
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0

      setStats({
        totalRides,
        totalEarnings,
        averageRating,
        completedRides,
      })

    } catch (error) {
      console.error("Error loading rides:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRides = rides.filter(ride => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      !searchTerm ||
      ride.pickup_address?.toLowerCase().includes(searchLower) ||
      ride.dropoff_address?.toLowerCase().includes(searchLower) ||
      ride.id.toLowerCase().includes(searchLower) ||
      ride.user?.full_name?.toLowerCase().includes(searchLower) ||
      ride.driver?.full_name?.toLowerCase().includes(searchLower)

    // Status filter
    const matchesStatus = 
      statusFilter === "all" || 
      ride.status === statusFilter

    // Date range filter
    const rideDate = new Date(ride.created_at)
    const matchesDateRange = 
      (!dateRange.start || rideDate >= new Date(dateRange.start)) &&
      (!dateRange.end || rideDate <= new Date(dateRange.end + "T23:59:59"))

    return matchesSearch && matchesStatus && matchesDateRange
  })

  const totalPages = Math.ceil(filteredRides.length / ITEMS_PER_PAGE)
  const paginatedRides = filteredRides.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    }

    const config = statusConfig[status] || { variant: "secondary" as const, label: status }
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      completed: { variant: "outline", label: "Paid" },
      failed: { variant: "destructive", label: "Failed" },
    }

    const config = statusConfig[status] || { variant: "secondary" as const, label: status }
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "Unknown time"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm")
    } catch {
      return "Invalid date"
    }
  }

  const handleExportCSV = () => {
    const headers = [
      "Ride ID",
      "Date",
      "Status",
      "Pickup",
      "Dropoff",
      "Distance (km)",
      "Duration (min)",
      "Fare",
      "Payment Method",
      "Payment Status",
      role === "driver" ? "Passenger" : "Driver",
      "Rating",
    ]

    const csvData = filteredRides.map(ride => [
      ride.id,
      formatDate(ride.created_at),
      ride.status,
      ride.pickup_address || "N/A",
      ride.dropoff_address || "N/A",
      ride.distance_km?.toFixed(2) || "N/A",
      ride.estimated_duration_min || "N/A",
      `$${ride.fare?.toFixed(2) || "0.00"}`,
      ride.payment_method?.replace("_", " ") || "N/A",
      ride.payment_status,
      role === "driver" ? ride.user?.full_name || "N/A" : ride.driver?.full_name || "N/A",
      ride.rating?.rating || "Not rated",
    ])

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ride-history-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSendSupportMessage = (rideId: string) => {
    // Navigate to support page with ride context
    window.location.href = `/support?ride=${rideId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading ride history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rides</p>
                <p className="text-2xl font-bold">{stats.totalRides}</p>
              </div>
              <Car className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completedRides}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {role === "driver" && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter your ride history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search rides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                min={dateRange.start}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedRides.length} of {filteredRides.length} rides
            </p>
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredRides.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rides Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ride History</CardTitle>
          <CardDescription>All your past and current rides</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRides.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-lg font-semibold">No rides found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || dateRange.start || dateRange.end
                  ? "Try adjusting your filters"
                  : role === "driver"
                  ? "Start accepting rides to see them here"
                  : "Book your first ride to see it here"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ride ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>{role === "driver" ? "Passenger" : "Driver"}</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRides.map((ride) => (
                      <TableRow key={ride.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">{ride.id.substring(0, 8)}...</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(ride.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{formatDate(ride.created_at)}</span>
                            {ride.completed_at && (
                              <span className="text-xs text-muted-foreground">
                                Completed: {formatDate(ride.completed_at)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1 max-w-[200px]">
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-xs truncate">
                                {ride.pickup_address || "No address"}
                              </span>
                            </div>
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="text-xs truncate">
                                {ride.dropoff_address || "No address"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                              <Navigation className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{ride.distance_km?.toFixed(1) || "N/A"} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{ride.estimated_duration_min || "N/A"} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                ${ride.fare?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(ride.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            {getPaymentStatusBadge(ride.payment_status)}
                            <span className="text-xs text-muted-foreground capitalize">
                              {ride.payment_method?.replace("_", " ") || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {role === "driver" ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{ride.user?.full_name || "Passenger"}</span>
                              {ride.user?.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs">{ride.user.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-medium">{ride.driver?.full_name || "Driver"}</span>
                              {ride.driver?.vehicle_make && ride.driver?.vehicle_model && (
                                <span className="text-xs text-muted-foreground">
                                  {ride.driver.vehicle_make} {ride.driver.vehicle_model}
                                </span>
                              )}
                              {ride.driver?.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs">{ride.driver.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRide(ride)}
                              className="h-8 px-2"
                            >
                              Details
                            </Button>
                            {ride.status === "completed" && !ride.rating && role === "user" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = `/rate/${ride.id}`}
                                className="h-8 px-2"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Rate
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendSupportMessage(ride.id)}
                              className="h-8 px-2"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Support
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ride Details Modal */}
      {selectedRide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ride Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRide(null)}>
                  ✕
                </Button>
              </div>
              <CardDescription>Ride ID: {selectedRide.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Status</h3>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedRide.status)}
                    <span className="text-sm text-muted-foreground">
                      Created: {formatDate(selectedRide.created_at)}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Payment</h3>
                  <div className="flex items-center gap-2">
                    {getPaymentStatusBadge(selectedRide.payment_status)}
                    <span className="text-sm text-muted-foreground capitalize">
                      {selectedRide.payment_method?.replace("_", " ") || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Route Details */}
              <div>
                <h3 className="text-sm font-medium mb-3">Route</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 flex-shrink-0">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pickup</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRide.pickup_address || "No address provided"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinates: {selectedRide.pickup_lat.toFixed(6)}, {selectedRide.pickup_lng.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 flex-shrink-0">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Dropoff</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRide.dropoff_address || "No address provided"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinates: {selectedRide.dropoff_lat.toFixed(6)}, {selectedRide.dropoff_lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Ride Metrics */}
              <div>
                <h3 className="text-sm font-medium mb-3">Ride Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Distance</p>
                    <p className="text-lg font-semibold">{selectedRide.distance_km?.toFixed(1) || "N/A"} km</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold">{selectedRide.estimated_duration_min || "N/A"} min</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Fare</p>
                    <p className="text-lg font-semibold">${selectedRide.fare?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* User/Driver Info */}
              <div>
                <h3 className="text-sm font-medium mb-3">
                  {role === "driver" ? "Passenger Information" : "Driver Information"}
                </h3>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                      {role === "driver" 
                        ? selectedRide.user?.full_name?.charAt(0) || "P"
                        : selectedRide.driver?.full_name?.charAt(0) || "D"
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {role === "driver" 
                          ? selectedRide.user?.full_name || "Passenger"
                          : selectedRide.driver?.full_name || "Driver"
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {role === "driver" 
                          ? selectedRide.user?.email || "No email"
                          : selectedRide.driver?.email || "No email"
                        }
                      </p>
                      {role === "driver" ? (
                        selectedRide.user?.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm">{selectedRide.user.rating.toFixed(1)}</span>
                          </div>
                        )
                      ) : (
                        selectedRide.driver && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedRide.driver.vehicle_make} {selectedRide.driver.vehicle_model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedRide.driver.vehicle_plate}
                            </p>
                            {selectedRide.driver.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm">{selectedRide.driver.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating */}
              {selectedRide.rating && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3">Rating</h3>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < selectedRide.rating!.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{selectedRide.rating.rating}/5</span>
                      </div>
                      {selectedRide.rating.comment && (
                        <p className="text-sm mt-2">"{selectedRide.rating.comment}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Rated on {formatDate(selectedRide.rating.created_at)}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Timeline */}
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Ride Requested</p>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedRide.created_at)}</p>
                    </div>
                  </div>

                  {selectedRide.started_at && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Ride Started</p>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedRide.started_at)}</p>
                      </div>
                    </div>
                  )}

                  {selectedRide.completed_at && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Ride Completed</p>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedRide.completed_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRide(null)}>
                  Close
                </Button>
                <Button onClick={() => handleSendSupportMessage(selectedRide.id)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
