'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Copy,
  Link2,
  Search,
  Plus,
  Users,
  Lock,
  Globe,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { useCurrentUser } from '@/hooks/use-current-user'

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall back to the legacy copy path below.
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }

  return copied
}

type RoomItem = {
  id: string
  name: string
  description: string | null
  topic: string
  hostName: string
  hostId: string
  isPrivate: boolean
  status: 'active' | 'archived' | 'scheduled'
  maxParticipants: number
  participantCount: number
}

const topics = ['All', 'general', 'programming', 'design', 'writing', 'math', 'science', 'languages', 'music', 'other']

export default function RoomsPage() {
  const router = useRouter()
  const { user: currentUser } = useCurrentUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [pendingJoinRoom, setPendingJoinRoom] = useState<RoomItem | null>(null)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [newRoom, setNewRoom] = useState({
    name: '',
    topic: 'general',
    description: '',
    maxParticipants: '10',
    isPrivate: false,
    password: '',
  })

  const loadRooms = async () => {
    setLoadingRooms(true)
    const response = await fetch('/api/rooms', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (response.ok && payload?.rooms) {
      setRooms(payload.rooms)
    }

    setLoadingRooms(false)
  }

  useEffect(() => {
    void loadRooms()
  }, [])

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.topic.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTopic = selectedTopic === 'All' || room.topic === selectedTopic
    return matchesSearch && matchesTopic
  })

  const handleCreateRoom = async () => {
    setCreateError(null)
    setIsCreating(true)

    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newRoom.name,
        category: newRoom.topic,
        description: newRoom.description || null,
        maxParticipants: Number(newRoom.maxParticipants),
        isPrivate: newRoom.isPrivate,
        password: newRoom.isPrivate ? newRoom.password : null,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setCreateError(payload?.error ?? 'Unable to create room')
      setIsCreating(false)
      return
    }

    setNewRoom({
      name: '',
      topic: 'general',
      description: '',
      maxParticipants: '10',
      isPrivate: false,
      password: '',
    })
    setShowCreateDialog(false)
    setIsCreating(false)
    await loadRooms()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'on-break':
        return 'bg-yellow-500'
      case 'inactive':
        return 'bg-muted-foreground'
      default:
        return 'bg-muted-foreground'
    }
  }

  const joinRoom = async (room: RoomItem, password?: string) => {
    setJoiningRoomId(room.id)
    setJoinError(null)

    const response = await fetch(`/api/rooms/${room.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password ?? null }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setJoinError(payload?.error ?? 'Unable to join room')
      setJoiningRoomId(null)
      return
    }

    setJoiningRoomId(null)
    setJoinPassword('')
    setPendingJoinRoom(null)
    router.push(`/rooms/${room.id}`)
  }

  const handleShareRoom = async (room: RoomItem) => {
    const inviteLink = `${window.location.origin}/rooms/${room.id}`
    const inviteText = room.isPrivate
      ? `Join my private study room: ${room.name}\nRoom ID: ${room.id}\nLink: ${inviteLink}\nPassword: use the room password set by the host`
      : `Join my study room: ${room.name}\nRoom ID: ${room.id}\nLink: ${inviteLink}`

    await copyToClipboard(inviteText)
  }

  const handleDeleteRoom = async (room: RoomItem) => {
    const confirmed = window.confirm(`Delete room \"${room.name}\"? This removes it for everyone.`)
    if (!confirmed) return

    setDeletingRoomId(room.id)

    const response = await fetch(`/api/rooms/${room.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await loadRooms()
    }

    setDeletingRoomId(null)
  }

  const handleJoinWithCode = async () => {
    if (!joinRoomId.trim()) {
      setJoinError('Room ID is required')
      return
    }

    setJoiningRoomId(joinRoomId.trim())
    setJoinError(null)

    const response = await fetch(`/api/rooms/${joinRoomId.trim()}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: joinPassword || null }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setJoinError(payload?.error ?? 'Unable to join room')
      setJoiningRoomId(null)
      return
    }

    const targetRoomId = joinRoomId.trim()
    setJoinRoomId('')
    setJoinPassword('')
    setShowJoinDialog(false)
    setJoiningRoomId(null)
    router.push(`/rooms/${targetRoomId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Study Rooms</h1>
          <p className="text-muted-foreground">Join a room or create your own</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Room</DialogTitle>
            </DialogHeader>
            <FieldGroup className="space-y-4 py-4">
              <Field>
                <FieldLabel htmlFor="room-name">Room Name</FieldLabel>
                <Input
                  id="room-name"
                  placeholder="e.g., Deep Work Zone"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="room-topic">Topic</FieldLabel>
                <Select
                  value={newRoom.topic}
                  onValueChange={(value) => setNewRoom((prev) => ({ ...prev, topic: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.slice(1).map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="room-description">Description (optional)</FieldLabel>
                <Input
                  id="room-description"
                  placeholder="What will you be studying?"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom((prev) => ({ ...prev, description: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="max-participants">Max Participants</FieldLabel>
                <Select
                  value={newRoom.maxParticipants}
                  onValueChange={(value) => setNewRoom((prev) => ({ ...prev, maxParticipants: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 15, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} people
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="private-room"
                  checked={newRoom.isPrivate}
                  onCheckedChange={(checked) =>
                    setNewRoom((prev) => ({ ...prev, isPrivate: checked === true }))
                  }
                />
                <label htmlFor="private-room" className="text-sm text-foreground cursor-pointer">
                  Make this room private (requires password)
                </label>
              </div>
              {newRoom.isPrivate && (
                <Field>
                  <FieldLabel htmlFor="room-password">Room Password</FieldLabel>
                  <Input
                    id="room-password"
                    type="password"
                    placeholder="Minimum 4 characters"
                    value={newRoom.password}
                    onChange={(e) => setNewRoom((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </Field>
              )}
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateRoom()}
                disabled={
                  isCreating ||
                  !newRoom.name.trim() ||
                  (newRoom.isPrivate && newRoom.password.trim().length < 4)
                }
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Join by Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Private Room</DialogTitle>
            </DialogHeader>
            <FieldGroup className="space-y-4 py-4">
              <Field>
                <FieldLabel htmlFor="join-room-id">Room ID</FieldLabel>
                <Input
                  id="join-room-id"
                  placeholder="Paste the room ID or invite code"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="join-room-password">Password</FieldLabel>
                <Input
                  id="join-room-password"
                  type="password"
                  placeholder="Room password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />
              </Field>
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            </FieldGroup>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinDialog(false)
                  setJoinRoomId('')
                  setJoinPassword('')
                  setJoinError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleJoinWithCode()}
                disabled={!joinRoomId.trim() || joiningRoomId === joinRoomId.trim()}
              >
                {joiningRoomId === joinRoomId.trim() ? 'Joining...' : 'Join Room'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-r-none',
                viewMode === 'grid' && 'bg-muted'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-l-none',
                viewMode === 'list' && 'bg-muted'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Rooms Grid/List */}
      {loadingRooms ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Loading rooms...</h3>
          </CardContent>
        </Card>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No rooms found</h3>
            <p className="text-muted-foreground text-center mt-2">
              Try adjusting your search or create a new room
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', getStatusColor(room.status))} />
                    <Badge variant="secondary">{room.topic}</Badge>
                  </div>
                  {room.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-1">{room.name}</h3>
                {room.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {room.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {room.participantCount}/{room.maxParticipants}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleShareRoom(room)}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    {currentUser.id && room.hostId === currentUser.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDeleteRoom(room)}
                        disabled={deletingRoomId === room.id}
                      >
                        {deletingRoomId === room.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        if (room.isPrivate) {
                          setPendingJoinRoom(room)
                          setJoinError(null)
                        } else {
                          void joinRoom(room)
                        }
                      }}
                      disabled={joiningRoomId === room.id}
                    >
                      {joiningRoomId === room.id ? 'Joining...' : 'Join'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="overflow-hidden transition-all hover:border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{room.name}</h3>
                        <span className={cn('h-2 w-2 rounded-full', getStatusColor(room.status))} />
                        {room.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {room.topic}
                        </Badge>
                        <span>-</span>
                        <span>Hosted by {room.hostName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {room.participantCount}/{room.maxParticipants}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void handleShareRoom(room)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      {currentUser.id && room.hostId === currentUser.id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDeleteRoom(room)}
                          disabled={deletingRoomId === room.id}
                        >
                          {deletingRoomId === room.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => {
                          if (room.isPrivate) {
                            setPendingJoinRoom(room)
                            setJoinError(null)
                          } else {
                            void joinRoom(room)
                          }
                        }}
                        disabled={joiningRoomId === room.id}
                      >
                        {joiningRoomId === room.id ? 'Joining...' : 'Join'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(pendingJoinRoom)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingJoinRoom(null)
            setJoinPassword('')
            setJoinError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Room Password</DialogTitle>
          </DialogHeader>
          <FieldGroup className="space-y-4 py-2">
            <Field>
              <FieldLabel htmlFor="join-password">Password</FieldLabel>
              <Input
                id="join-password"
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Enter room password"
              />
            </Field>
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingJoinRoom(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pendingJoinRoom && void joinRoom(pendingJoinRoom, joinPassword)}
              disabled={!joinPassword.trim() || (pendingJoinRoom ? joiningRoomId === pendingJoinRoom.id : false)}
            >
              {pendingJoinRoom && joiningRoomId === pendingJoinRoom.id ? 'Joining...' : 'Join Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
