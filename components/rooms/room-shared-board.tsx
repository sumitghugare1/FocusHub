'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Plus,
  Upload,
  Clock3,
  User,
  Pencil,
  Trash2,
} from 'lucide-react'
import { formatTimeAgo } from '@/lib/format'
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

type SharedResource = {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar?: string
  resourceType: 'note' | 'file'
  title: string | null
  content: string | null
  fileName: string | null
  filePath: string | null
  mimeType: string | null
  fileSize: number | null
  createdAt: string
  previewUrl: string | null
  downloadUrl: string | null
}

function formatFileSize(size: number | null) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function RoomSharedBoard({
  roomId,
  currentUserId,
  canManageAll,
}: {
  roomId: string
  currentUserId?: string
  canManageAll?: boolean
}) {
  const [resources, setResources] = useState<SharedResource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editingResource, setEditingResource] = useState<SharedResource | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [resourceActionError, setResourceActionError] = useState<string | null>(null)

  const selectedFilesPreview = useMemo(
    () => files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
    [files],
  )

  const loadResources = async () => {
    setIsLoading(true)
    const response = await fetch(`/api/rooms/${roomId}/resources`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setResources([])
      setError(payload?.error ?? 'Unable to load shared board')
      setIsLoading(false)
      return
    }

    setResources(payload.resources ?? [])
    setError(null)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadResources()
  }, [roomId])

  const handleNoteSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim() && files.length === 0) return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    const formData = new FormData()
    formData.set('resourceType', 'note')
    formData.set('title', title)
    formData.set('content', content)
    for (const file of files) {
      formData.append('files', file)
    }

    const response = await fetch(`/api/rooms/${roomId}/resources`, {
      method: 'POST',
      body: formData,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? 'Unable to share note')
      setIsSaving(false)
      return
    }

    setTitle('')
    setContent('')
    setFiles([])
    setMessage('Shared to board')
    setIsSaving(false)
    await loadResources()
  }

  const handleFileUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData()
    formData.set('resourceType', 'file')
    formData.set('title', title)
    for (const file of files) {
      formData.append('files', file)
    }

    const response = await fetch(`/api/rooms/${roomId}/resources`, {
      method: 'POST',
      body: formData,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? 'Unable to upload files')
      setIsUploading(false)
      return
    }

    setTitle('')
    setFiles([])
    setMessage('Files shared to board')
    setIsUploading(false)
    await loadResources()
  }

  const openEditResource = (resource: SharedResource) => {
    setEditingResource(resource)
    setEditTitle(resource.title ?? '')
    setEditContent(resource.content ?? '')
    setResourceActionError(null)
  }

  const saveEditResource = async () => {
    if (!editingResource) return

    setIsSavingEdit(true)
    setResourceActionError(null)

    const response = await fetch(`/api/rooms/${roomId}/resources/${editingResource.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        content: editingResource.resourceType === 'note' ? editContent : undefined,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setResourceActionError(payload?.error ?? 'Unable to update item')
      setIsSavingEdit(false)
      return
    }

    setEditingResource(null)
    setEditTitle('')
    setEditContent('')
    setIsSavingEdit(false)
    setMessage('Board item updated')
    await loadResources()
  }

  const canManageResource = (resource: SharedResource) => {
    if (canManageAll) return true
    return Boolean(currentUserId && resource.userId === currentUserId)
  }

  const deleteResource = async (resourceId: string) => {
    setResourceActionError(null)

    const response = await fetch(`/api/rooms/${roomId}/resources/${resourceId}`, {
      method: 'DELETE',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setResourceActionError(payload?.error ?? 'Unable to delete item')
      return
    }

    setMessage('Board item deleted')
    await loadResources()
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Shared Board
            </CardTitle>
            <CardDescription>Shared notes, PDFs, and images are visible to room members.</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            {resources.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleNoteSubmit} className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
            />
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write a shared note for the room..."
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                <Upload className="h-4 w-4" />
                Attach PDFs or images
                <input
                  className="hidden"
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                />
              </label>
              {files.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span>
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedFilesPreview.map((file) => (
                      <Badge key={`${file.name}-${file.size}`} variant="outline" className="gap-1">
                        {file.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving || (!content.trim() && files.length === 0)}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? 'Sharing...' : 'Share Note'}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleFileUpload()} disabled={isUploading || files.length === 0}>
                <Paperclip className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {resourceActionError && <p className="text-sm text-destructive">{resourceActionError}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>

        <Separator />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading shared board...</p>
        ) : resources.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="font-medium">Nothing shared yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a note or upload a PDF/image so the whole room can access it.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {resources.map((resource) => (
              <div key={resource.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={resource.resourceType === 'file' ? 'default' : 'secondary'}>
                        {resource.resourceType === 'file' ? 'File' : 'Note'}
                      </Badge>
                      {resource.title && <p className="font-medium">{resource.title}</p>}
                    </div>
                    {resource.content && <p className="whitespace-pre-wrap text-sm text-foreground">{resource.content}</p>}

                    {resource.resourceType === 'file' && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {resource.mimeType?.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        <span>{resource.fileName}</span>
                        <span>{formatFileSize(resource.fileSize)}</span>
                      </div>
                    )}

                    {resource.previewUrl && resource.mimeType?.startsWith('image/') && (
                      <a href={resource.previewUrl} target="_blank" rel="noreferrer" className="block max-w-sm overflow-hidden rounded-lg border bg-muted/20">
                        <img src={resource.previewUrl} alt={resource.fileName ?? 'Shared image'} className="h-auto w-full object-cover" />
                      </a>
                    )}

                    {resource.previewUrl && resource.mimeType === 'application/pdf' && (
                      <div className="max-w-3xl overflow-hidden rounded-lg border bg-muted/20">
                        <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
                          <span>PDF Preview</span>
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <Link href={resource.previewUrl} target="_blank">
                              Open PDF
                            </Link>
                          </Button>
                        </div>
                        <iframe
                          src={resource.previewUrl}
                          title={resource.fileName ?? 'PDF preview'}
                          className="h-[420px] w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{resource.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      <span>{formatTimeAgo(resource.createdAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      {resource.downloadUrl && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={resource.downloadUrl} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Link>
                        </Button>
                      )}
                      {canManageResource(resource) && (
                        <Button variant="outline" size="sm" onClick={() => openEditResource(resource)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {canManageResource(resource) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete shared item?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the note or uploaded file for everyone in the room.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void deleteResource(resource.id)}
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
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(editingResource)} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit shared item</DialogTitle>
            <DialogDescription>
              Update the title or note text. Uploaded file replacements are not supported yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Title" />
            {editingResource?.resourceType === 'note' && (
              <Textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                rows={5}
                placeholder="Note content"
              />
            )}
            {resourceActionError && <p className="text-sm text-destructive">{resourceActionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingResource(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEditResource()} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
