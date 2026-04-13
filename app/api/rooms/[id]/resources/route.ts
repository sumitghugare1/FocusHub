import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

const ROOM_SHARED_ASSETS_BUCKET = 'room-shared-assets'
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf']
const MAX_FILE_SIZE = 15 * 1024 * 1024

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'file'
}

async function canAccessRoom(supabase: ReturnType<typeof createRouteClient>, roomId: string, userId: string) {
  const [{ data: membership }, { data: room }] = await Promise.all([
    supabase.from('room_members').select('id').eq('room_id', roomId).eq('user_id', userId).maybeSingle(),
    supabase.from('rooms').select('host_id, is_private').eq('id', roomId).maybeSingle(),
  ])

  return Boolean(membership) || room?.host_id === userId || room?.is_private === false
}

async function buildResourcePayload(
  supabase: ReturnType<typeof createRouteClient>,
  resource: {
    id: string
    room_id: string
    user_id: string
    resource_type: string
    title: string | null
    content: string | null
    file_name: string | null
    file_path: string | null
    mime_type: string | null
    file_size: number | null
    created_at: string
    profiles?: { full_name: string | null; username: string | null; avatar_url: string | null } | Array<{ full_name: string | null; username: string | null; avatar_url: string | null }>
  },
) {
  const profile = Array.isArray(resource.profiles) ? resource.profiles[0] : resource.profiles
  const signedUrl =
    resource.file_path && resource.resource_type === 'file'
      ? await supabase.storage.from(ROOM_SHARED_ASSETS_BUCKET).createSignedUrl(resource.file_path, 60 * 30)
      : null

  return {
    id: resource.id,
    roomId: resource.room_id,
    userId: resource.user_id,
    userName: profile?.full_name || profile?.username || 'User',
    userAvatar: profile?.avatar_url || undefined,
    resourceType: resource.resource_type,
    title: resource.title,
    content: resource.content,
    fileName: resource.file_name,
    filePath: resource.file_path,
    mimeType: resource.mime_type,
    fileSize: resource.file_size,
    createdAt: resource.created_at,
    previewUrl: signedUrl?.data?.signedUrl ?? null,
    downloadUrl: resource.file_path ? `/api/rooms/${resource.room_id}/resources/${resource.id}/download` : null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await canAccessRoom(supabase, id, user.id))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { data: resources, error } = await supabase
    .from('room_shared_resources')
    .select(
      'id, room_id, user_id, resource_type, title, content, file_name, file_path, mime_type, file_size, created_at, profiles:user_id ( full_name, username, avatar_url )',
    )
    .eq('room_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const mapped = await Promise.all((resources ?? []).map((resource) => buildResourcePayload(supabase, resource)))

  return NextResponse.json({ success: true, resources: mapped }, { headers: response.headers })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await canAccessRoom(supabase, id, user.id))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const title = String(formData.get('title') ?? '').trim()
  const content = String(formData.get('content') ?? '').trim()
  const noteKind = String(formData.get('resourceType') ?? 'note')
  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (!content && files.length === 0) {
    return NextResponse.json({ success: false, error: 'Add a note or attach a file' }, { status: 400 })
  }

  const createdResources: Array<{
    id: string
    roomId: string
    userId: string
    userName: string
    userAvatar?: string
    resourceType: string
    title: string | null
    content: string | null
    fileName: string | null
    filePath: string | null
    mimeType: string | null
    fileSize: number | null
    createdAt: string
    previewUrl: string | null
    downloadUrl: string | null
  }> = []

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, username, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (content) {
    const { data: insertedNote, error: noteError } = await supabase
      .from('room_shared_resources')
      .insert({
        room_id: id,
        user_id: user.id,
        resource_type: noteKind === 'file' ? 'file' : 'note',
        title: title || null,
        content,
      })
      .select('id, room_id, user_id, resource_type, title, content, file_name, file_path, mime_type, file_size, created_at')
      .single()

    if (noteError) {
      return NextResponse.json({ success: false, error: noteError.message }, { status: 400 })
    }

    createdResources.push({
      id: insertedNote.id,
      roomId: insertedNote.room_id,
      userId: insertedNote.user_id,
      userName: userProfile?.full_name || userProfile?.username || 'User',
      userAvatar: userProfile?.avatar_url || undefined,
      resourceType: insertedNote.resource_type,
      title: insertedNote.title,
      content: insertedNote.content,
      fileName: insertedNote.file_name,
      filePath: insertedNote.file_path,
      mimeType: insertedNote.mime_type,
      fileSize: insertedNote.file_size,
      createdAt: insertedNote.created_at,
      previewUrl: null,
      downloadUrl: null,
    })
  }

  const uploadedObjects: string[] = []

  for (const file of files) {
    const mimeType = file.type || 'application/octet-stream'
    const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Only PDF and image files are allowed' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Files must be 15MB or smaller' },
        { status: 400 },
      )
    }

    const resourceId = randomUUID()
    const fileName = sanitizeFileName(file.name)
    const filePath = `${id}/${resourceId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(ROOM_SHARED_ASSETS_BUCKET)
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      for (const path of uploadedObjects) {
        await supabase.storage.from(ROOM_SHARED_ASSETS_BUCKET).remove([path])
      }

      return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 })
    }

    uploadedObjects.push(filePath)

    const { data: insertedFile, error: fileError } = await supabase
      .from('room_shared_resources')
      .insert({
        id: resourceId,
        room_id: id,
        user_id: user.id,
        resource_type: 'file',
        title: title || null,
        file_name: file.name,
        file_path: filePath,
        mime_type: mimeType,
        file_size: file.size,
      })
      .select('id, room_id, user_id, resource_type, title, content, file_name, file_path, mime_type, file_size, created_at')
      .single()

    if (fileError) {
      await supabase.storage.from(ROOM_SHARED_ASSETS_BUCKET).remove([filePath])
      for (const path of uploadedObjects.filter((path) => path !== filePath)) {
        await supabase.storage.from(ROOM_SHARED_ASSETS_BUCKET).remove([path])
      }
      return NextResponse.json({ success: false, error: fileError.message }, { status: 400 })
    }

    createdResources.push({
      id: insertedFile.id,
      roomId: insertedFile.room_id,
      userId: insertedFile.user_id,
      userName: userProfile?.full_name || userProfile?.username || 'User',
      userAvatar: userProfile?.avatar_url || undefined,
      resourceType: insertedFile.resource_type,
      title: insertedFile.title,
      content: insertedFile.content,
      fileName: insertedFile.file_name,
      filePath: insertedFile.file_path,
      mimeType: insertedFile.mime_type,
      fileSize: insertedFile.file_size,
      createdAt: insertedFile.created_at,
      previewUrl: null,
      downloadUrl: null,
    })
  }

  const mapped = await Promise.all(createdResources.map(async (resource) => {
    if (resource.filePath) {
      const { data } = await supabase.storage.from(ROOM_SHARED_ASSETS_BUCKET).createSignedUrl(resource.filePath, 60 * 30)
      const signedUrl = data?.signedUrl ?? null
      return {
        ...resource,
        previewUrl: resource.mimeType?.startsWith('image/') ? signedUrl : null,
        downloadUrl: `/api/rooms/${resource.roomId}/resources/${resource.id}/download`,
      }
    }

    return resource
  }))

  return NextResponse.json({ success: true, resources: mapped }, { headers: response.headers })
}
