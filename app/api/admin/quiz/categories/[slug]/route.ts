import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { ensureAdmin } from '@/lib/auth/admin'

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const payload = parsed.data
  const routeParams = await params

  if (!payload.name && payload.description === undefined && payload.isActive === undefined) {
    return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 })
  }

  const { error } = await supabase
    .from('quiz_categories')
    .update({
      name: payload.name,
      description: payload.description,
      is_active: payload.isActive,
    })
    .eq('slug', routeParams.slug)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const routeParams = await params

  const { count: attemptsCount, error: attemptsError } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('category_slug', routeParams.slug)

  if (attemptsError) {
    return NextResponse.json({ success: false, error: attemptsError.message }, { status: 400 })
  }

  if ((attemptsCount ?? 0) > 0) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete category with existing attempts. Disable it instead.' },
      { status: 400 },
    )
  }

  const { error } = await supabase.from('quiz_categories').delete().eq('slug', routeParams.slug)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
