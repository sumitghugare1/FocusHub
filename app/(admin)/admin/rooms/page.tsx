"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  MoreHorizontal,
  Plus,
  Filter,
  Eye,
  Trash2,
  Lock,
  Unlock,
  DoorOpen,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react"

type AdminRoom = {
  id: string
  name: string
  host: { name: string; avatar: string }
  category: string
  participants: number
  maxParticipants: number
  isPrivate: boolean
  status: string
  totalHours: number
  createdAt: string
}

type RoomsPayload = {
  stats: {
    total: number
    active: number
    inactive: number
    flagged: number
  }
  rooms: AdminRoom[]
}

export default function AdminRoomsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [roomsData, setRoomsData] = useState<RoomsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const loadRooms = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/admin/rooms', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? 'Failed to load rooms')
        }

        if (!ignore) {
          setRoomsData(payload)
        }
      } catch (e) {
        if (!ignore) {
          setError(e instanceof Error ? e.message : 'Failed to load rooms')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadRooms()

    return () => {
      ignore = true
    }
  }, [])

  const allRooms = roomsData?.rooms ?? []

  const filteredRooms = useMemo(() => allRooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || room.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || room.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  }), [allRooms, searchQuery, selectedCategory, selectedStatus])

  const stats = roomsData?.stats ?? {
    total: 0,
    active: 0,
    inactive: 0,
    flagged: 0,
  }

  const uniqueCategories = Array.from(new Set(allRooms.map((room) => room.category))).sort()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Room Management</h1>
          <p className="text-muted-foreground">Monitor and manage all study rooms</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.flagged}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Study Rooms</CardTitle>
          <CardDescription>All study rooms on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
          {isLoading ? <p className="mb-4 text-sm text-muted-foreground">Loading rooms...</p> : null}

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {room.isPrivate && <Lock className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{room.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={room.host.avatar} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {room.host.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{room.host.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{room.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={room.participants === room.maxParticipants ? "text-destructive" : ""}>
                        {room.participants}/{room.maxParticipants}
                      </span>
                    </TableCell>
                    <TableCell>{room.totalHours}h</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          room.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {room.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Room
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {room.isPrivate ? (
                              <>
                                <Unlock className="mr-2 h-4 w-4" />
                                Make Public
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Make Private
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
