'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Brain,
  Coffee,
  Copy,
  Link2,
  LogOut,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultTimerSettings } from '@/lib/mock-data'

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

type TimerMode = 'focus' | 'short-break' | 'long-break'

type RoomDetail = {
  id: string
  name: string
  description: string | null
  topic: string
  hostName: string
  isPrivate: boolean
  status: 'active' | 'archived' | 'scheduled'
  maxParticipants: number
  participantCount: number
  requiresPassword: boolean
  isMember: boolean
  isHost: boolean
}

type RoomMessage = {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  timestamp: string
  messageType?: 'text' | 'system' | 'achievement'
}

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = String(params.id ?? '')

  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [joinPassword, setJoinPassword] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [timerMode, setTimerMode] = useState<TimerMode>('focus')
  const [timeRemaining, setTimeRemaining] = useState(defaultTimerSettings.focusDuration * 60)
  const [isRunning, setIsRunning] = useState(false)

  const loadRoom = useCallback(async () => {
    setIsLoadingRoom(true)
    setRoomError(null)

    const response = await fetch(`/api/rooms/${roomId}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setRoomError(payload?.error ?? 'Unable to load room')
      setRoom(null)
      setIsLoadingRoom(false)
      return
    }

    setRoom(payload.room)
    setIsLoadingRoom(false)
  }, [roomId])

  const loadMessages = useCallback(async () => {
    if (!room) return

    setIsLoadingMessages(true)
    const response = await fetch(`/api/rooms/${room.id}/messages`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (response.ok && payload?.messages) {
      setMessages(payload.messages)
    } else {
      setMessages([])
    }

    setIsLoadingMessages(false)
  }, [room])

  useEffect(() => {
    if (roomId) {
      void loadRoom()
    }
  }, [roomId, loadRoom])

  useEffect(() => {
    if (!room) return
    if (room.requiresPassword || room.isMember) {
      return
    }

    const autoJoinPublicRoom = async () => {
      setIsJoining(true)
      const response = await fetch(`/api/rooms/${room.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: null }),
      })

      if (response.ok) {
        await loadRoom()
      }
      setIsJoining(false)
    }

    void autoJoinPublicRoom()
  }, [room, loadRoom])

  useEffect(() => {
    if (!room) return
    if (room.requiresPassword && !room.isMember) return
    void loadMessages()
  }, [room, loadMessages])

  useEffect(() => {
    if (!chatOpen || !room) return
    if (room.requiresPassword && !room.isMember) return

    void loadMessages()

    const interval = window.setInterval(() => {
      void loadMessages()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [chatOpen, room, loadMessages])

  const getDurationForMode = useCallback((mode: TimerMode) => {
    switch (mode) {
      case 'focus':
        return defaultTimerSettings.focusDuration * 60
      case 'short-break':
        return defaultTimerSettings.shortBreakDuration * 60
      case 'long-break':
        return defaultTimerSettings.longBreakDuration * 60
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeRemaining])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => setIsRunning((prev) => !prev)

  const resetTimer = () => {
    setTimeRemaining(getDurationForMode(timerMode))
    setIsRunning(false)
  }

  const changeMode = (mode: TimerMode) => {
    setTimerMode(mode)
    setTimeRemaining(getDurationForMode(mode))
    setIsRunning(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !room) return

    const response = await fetch(`/api/rooms/${room.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageInput }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setRoomError(payload?.error ?? 'Unable to send message')
      return
    }

    if (payload?.message) {
      setMessages((prev) => [...prev, payload.message])
    }
    setMessageInput('')
  }

  const handleJoinPrivateRoom = async () => {
    if (!room) return

    setIsJoining(true)
    setRoomError(null)

    const response = await fetch(`/api/rooms/${room.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: joinPassword }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setRoomError(payload?.error ?? 'Unable to join room')
      setIsJoining(false)
      return
    }

    setJoinPassword('')
    setIsJoining(false)
    await loadRoom()
  }

  const handleLeaveRoom = async () => {
    if (!room) return

    setIsLeaving(true)
    setRoomError(null)

    const response = await fetch(`/api/rooms/${room.id}/leave`, {
      method: 'POST',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setRoomError(payload?.error ?? 'Unable to leave room')
      setIsLeaving(false)
      return
    }

    router.push('/rooms')
    router.refresh()
  }

  const handleDeleteRoom = async () => {
    if (!room) return

    setIsDeleting(true)
    setRoomError(null)

    const response = await fetch(`/api/rooms/${room.id}`, {
      method: 'DELETE',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setRoomError(payload?.error ?? 'Unable to delete room')
      setIsDeleting(false)
      return
    }

    router.push('/rooms')
    router.refresh()
  }

  const shareRoom = async () => {
    if (!room) return

    const inviteLink = `${window.location.origin}/rooms/${room.id}`
    const shareText = room.isPrivate
      ? `Join my private study room: ${room.name}\nRoom ID: ${room.id}\nLink: ${inviteLink}\nPassword: use the room password set by the host`
      : `Join my study room: ${room.name}\nRoom ID: ${room.id}\nLink: ${inviteLink}`

    const copied = await copyToClipboard(shareText)
    setCopyMessage(copied ? 'Invite copied' : 'Copy failed')
    setShareOpen(false)
  }

  const progress = useMemo(
    () => (timeRemaining / getDurationForMode(timerMode)) * 100,
    [timeRemaining, timerMode, getDurationForMode],
  )

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getModeColor = (mode: TimerMode) => {
    switch (mode) {
      case 'focus':
        return 'text-primary'
      case 'short-break':
        return 'text-green-500'
      case 'long-break':
        return 'text-blue-500'
    }
  }

  if (isLoadingRoom) {
    return <div className="p-6 text-muted-foreground">Loading room...</div>
  }

  if (!room) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Room not found</h1>
        {roomError && <p className="text-sm text-destructive">{roomError}</p>}
        <Button asChild>
          <Link href="/rooms">Back to Rooms</Link>
        </Button>
      </div>
    )
  }

  if (room.requiresPassword && !room.isMember) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Private Room</h1>
        <p className="text-muted-foreground">Enter the room password to join {room.name}.</p>
        <Input
          type="password"
          placeholder="Room password"
          value={joinPassword}
          onChange={(e) => setJoinPassword(e.target.value)}
        />
        {roomError && <p className="text-sm text-destructive">{roomError}</p>}
        <div className="flex gap-2">
          <Button onClick={() => void handleJoinPrivateRoom()} disabled={!joinPassword.trim() || isJoining}>
            {isJoining ? 'Joining...' : 'Join Room'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/rooms">Back</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{room.name}</h1>
            <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>{room.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {room.topic} - Hosted by {room.hostName}
          </p>
          {room.description && <p className="text-sm text-muted-foreground mt-1">{room.description}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Room</DialogTitle>
                <DialogDescription>
                  Public rooms can be joined with the room ID alone. Private rooms need the ID and password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-lg border p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Room ID</p>
                  <p className="font-medium break-all">{room.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Link</p>
                  <p className="font-medium break-all">{typeof window !== 'undefined' ? `${window.location.origin}/rooms/${room.id}` : `/rooms/${room.id}`}</p>
                </div>
                <p className="text-muted-foreground">
                  {room.isPrivate
                    ? 'Private rooms require the password set by the host.'
                    : 'This is a public room. Room ID is enough to join.'}
                </p>
                {copyMessage && <p className="text-xs text-muted-foreground">{copyMessage}</p>}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => void copyToClipboard(room.id).then((copied) => setCopyMessage(copied ? 'Room ID copied' : 'Copy failed'))}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </Button>
                <Button onClick={() => void shareRoom()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Invite Text
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet open={chatOpen} onOpenChange={setChatOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {messages.length}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Room Chat</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 py-4">
                <div className="space-y-3">
                  {isLoadingMessages ? (
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="rounded-lg bg-muted px-3 py-2">
                        <p className="text-xs text-muted-foreground">{message.userName}</p>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="flex gap-2 border-t pt-4">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </SheetContent>
          </Sheet>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Leave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Room?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave this study room?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button onClick={() => void handleLeaveRoom()} disabled={isLeaving}>
                    {isLeaving ? 'Leaving...' : 'Leave Room'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {room.isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Room'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Room?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the room, its membership, and all messages for everyone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => void handleDeleteRoom()} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Delete Room'}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {roomError && <p className="text-sm text-destructive">{roomError}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-8">
            <div className="mb-8 flex justify-center gap-2">
              <Button variant={timerMode === 'focus' ? 'default' : 'ghost'} size="sm" onClick={() => changeMode('focus')}>
                <Brain className="mr-2 h-4 w-4" />
                Focus
              </Button>
              <Button variant={timerMode === 'short-break' ? 'default' : 'ghost'} size="sm" onClick={() => changeMode('short-break')}>
                <Coffee className="mr-2 h-4 w-4" />
                Short Break
              </Button>
              <Button variant={timerMode === 'long-break' ? 'default' : 'ghost'} size="sm" onClick={() => changeMode('long-break')}>
                <Coffee className="mr-2 h-4 w-4" />
                Long Break
              </Button>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64 md:h-72 md:w-72">
                <svg className="h-full w-full -rotate-90 transform">
                  <circle cx="50%" cy="50%" r="120" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={cn('transition-all duration-1000', getModeColor(timerMode))}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-foreground">{formatTime(timeRemaining)}</span>
                  <Badge variant="secondary" className="mt-2">
                    {timerMode === 'focus' && 'Focus Time'}
                    {timerMode === 'short-break' && 'Short Break'}
                    {timerMode === 'long-break' && 'Long Break'}
                  </Badge>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={resetTimer}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button size="lg" className="h-14 w-14 rounded-full" onClick={toggleTimer}>
                  {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Room Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Participants</span>
              <span>{room.participantCount}/{room.maxParticipants}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Host</span>
              <span>{room.hostName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Privacy</span>
              <span>{room.isPrivate ? 'Private' : 'Public'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
