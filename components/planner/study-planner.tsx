'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Filter,
  Flag,
  Pencil,
  Plus,
  Trash2,
  Users,
  List,
} from 'lucide-react'
import { formatTimeAgo } from '@/lib/format'

type PlannerItem = {
  id: string
  userId: string
  roomId: string | null
  roomName: string | null
  userName: string
  userAvatar?: string
  title: string
  description: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'completed'
  estimatedMinutes: number | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

const priorityStyles: Record<PlannerItem['priority'], string> = {
  low: 'bg-emerald-500/10 text-emerald-500',
  medium: 'bg-amber-500/10 text-amber-500',
  high: 'bg-destructive/10 text-destructive',
}

function formatDueDate(value: string | null) {
  if (!value) return 'No due date'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function scopeTitle(roomId?: string, roomName?: string) {
  if (roomId) return roomName ? `Room Planner · ${roomName}` : 'Room Planner'
  return 'Study Planner'
}

export function StudyPlanner({
  roomId,
  roomName,
  currentUserId,
  canManageAll,
}: {
  roomId?: string
  roomName?: string
  currentUserId?: string
  canManageAll?: boolean
}) {
  const [items, setItems] = useState<PlannerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | PlannerItem['status']>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<PlannerItem['priority']>('medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<PlannerItem['priority']>('medium')
  const [editStatus, setEditStatus] = useState<PlannerItem['status']>('todo')
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState('')

  const endpoint = useMemo(() => {
    if (!roomId) return '/api/planner'
    return `/api/planner?roomId=${roomId}`
  }, [roomId])

  const canManageItem = (item: PlannerItem) => canManageAll || item.userId === currentUserId

  const loadItems = async () => {
    setIsLoading(true)
    const response = await fetch(endpoint, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setItems([])
      setError(payload?.error ?? 'Unable to load planner items')
      setIsLoading(false)
      return
    }

    setItems(payload.items ?? [])
    setError(null)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadItems()
  }, [endpoint])

  const filteredItems = useMemo(
    () =>
      items.filter((item) => filterStatus === 'all' || item.status === filterStatus),
    [items, filterStatus],
  )

  const calendarGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string
        sortKey: number
        items: PlannerItem[]
      }
    >()

    for (const item of filteredItems) {
      const key = item.dueDate ?? 'no-due-date'
      const sortKey = item.dueDate ? new Date(item.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const label = item.dueDate
        ? new Date(item.dueDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'No due date'

      const group = groups.get(key)
      if (group) {
        group.items.push(item)
      } else {
        groups.set(key, { label, sortKey, items: [item] })
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey)
  }, [filteredItems])

  const renderItemCard = (item: PlannerItem) => (
    <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.status === 'completed' ? 'secondary' : 'default'}>
              {item.status.replace('_', ' ')}
            </Badge>
            <Badge className={priorityStyles[item.priority]}>{item.priority}</Badge>
            <p className="font-medium">{item.title}</p>
          </div>

          {item.description && <p className="whitespace-pre-wrap text-sm text-foreground">{item.description}</p>}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {formatDueDate(item.dueDate)}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="h-4 w-4" />
              {item.estimatedMinutes ? `${item.estimatedMinutes} min` : 'No estimate'}
            </span>
            <span className="flex items-center gap-1">
              <Flag className="h-4 w-4" />
              {item.userName} · {formatTimeAgo(item.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void toggleStatus(item)}>
            {item.status === 'completed' ? (
              <CircleDashed className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {item.status === 'completed' ? 'Reopen' : 'Complete'}
          </Button>
          {canManageItem(item) && (
            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canManageItem(item) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete planner item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the task from the planner for everyone who can see it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handleDelete(item.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  )

  const createItem = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    const response = await fetch('/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: roomId ?? null,
        title,
        description: description || null,
        dueDate: dueDate || null,
        priority,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? 'Unable to add planner item')
      setIsSaving(false)
      return
    }

    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    setEstimatedMinutes('')
    setIsSaving(false)
    setMessage('Task added')
    await loadItems()
  }

  const updateItem = async (itemId: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/planner/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error ?? 'Unable to update planner item')
    }
  }

  const deleteItem = async (itemId: string) => {
    const response = await fetch(`/api/planner/${itemId}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error ?? 'Unable to delete planner item')
    }
  }

  const toggleStatus = async (item: PlannerItem) => {
    const nextStatus = item.status === 'completed' ? 'todo' : 'completed'
    setError(null)
    try {
      await updateItem(item.id, { status: nextStatus })
      setMessage(nextStatus === 'completed' ? 'Task completed' : 'Task reopened')
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task')
    }
  }

  const openEdit = (item: PlannerItem) => {
    setEditingItem(item)
    setEditTitle(item.title)
    setEditDescription(item.description ?? '')
    setEditDueDate(item.dueDate ?? '')
    setEditPriority(item.priority)
    setEditStatus(item.status)
    setEditEstimatedMinutes(item.estimatedMinutes ? String(item.estimatedMinutes) : '')
    setError(null)
  }

  const saveEdit = async () => {
    if (!editingItem) return

    setIsSavingEdit(true)
    setError(null)

    try {
      await updateItem(editingItem.id, {
        title: editTitle,
        description: editDescription || null,
        dueDate: editDueDate || null,
        priority: editPriority,
        status: editStatus,
        estimatedMinutes: editEstimatedMinutes ? Number(editEstimatedMinutes) : null,
      })

      setEditingItem(null)
      setMessage('Task updated')
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    setError(null)
    try {
      await deleteItem(itemId)
      setMessage('Task deleted')
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task')
    }
  }

  const counts = items.reduce(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    { todo: 0, in_progress: 0, completed: 0 },
  )

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {scopeTitle(roomId, roomName)}
            </CardTitle>
            <CardDescription>
              Plan study tasks, track ownership, and keep a shared task list when you are in a room.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            {items.length}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'todo', 'in_progress', 'completed'] as const).map((status) => (
            <Button
              key={status}
              type="button"
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {status === 'all' ? 'All' : status.replace('_', ' ')}
              {status !== 'all' && <span className="ml-2 rounded-full bg-background/10 px-2 py-0.5 text-xs">{counts[status]}</span>}
            </Button>
          ))}

          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button
              type="button"
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={createItem} className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
            <Select value={priority} onValueChange={(value) => setPriority(value as PlannerItem['priority'])}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low priority</SelectItem>
                <SelectItem value="medium">Medium priority</SelectItem>
                <SelectItem value="high">High priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Task notes or study details"
            rows={3}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <Input
              type="number"
              min={1}
              max={1440}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
              placeholder="Estimated mins"
            />
            <Button type="submit" disabled={isSaving || !title.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              {isSaving ? 'Adding...' : 'Add Task'}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>

        <Separator />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading planner...</p>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="font-medium">No planner items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a task to plan your study session or coordinate with room members.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid gap-4">
            {filteredItems.map((item) => renderItemCard(item))}
          </div>
        ) : (
          <div className="grid gap-4">
            {calendarGroups.map((group) => (
              <div key={group.label} className="rounded-xl border bg-muted/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-foreground">{group.label}</p>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </div>
                <div className="grid gap-3">
                  {group.items.map((item) => renderItemCard(item))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Update the planner item details and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Task title" />
            <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={4} placeholder="Description" />
            <div className="grid gap-3 md:grid-cols-2">
              <Input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} />
              <Input
                type="number"
                min={1}
                max={1440}
                value={editEstimatedMinutes}
                onChange={(event) => setEditEstimatedMinutes(event.target.value)}
                placeholder="Estimated mins"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={editPriority} onValueChange={(value) => setEditPriority(value as PlannerItem['priority'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low priority</SelectItem>
                  <SelectItem value="medium">Medium priority</SelectItem>
                  <SelectItem value="high">High priority</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as PlannerItem['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
