import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, hasPermission } from '@/lib/admin-auth'
import { logAction } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/rate-limit'
import { updateContentByKeySchema, validateContentValue } from '@/lib/cms-validate'

interface RouteContext {
  params: Promise<{ key: string }>
}

function adminLimited(request: NextRequest) {
  const rl = checkAdminRateLimit(request)
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
  }
  return null
}

/** GET - Get content by key */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageContent')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { key } = await context.params

    const item = await db.content.findUnique({ where: { key } })

    if (!item) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Content get by key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT - Update content by key */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageContent')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { key } = await context.params
    const body = await request.json()
    const parsed = updateContentByKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' },
        { status: 400 }
      )
    }

    const existing = await db.content.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = { updatedBy: session.email }
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type
    if (parsed.data.value !== undefined) updateData.value = parsed.data.value
    if (parsed.data.label !== undefined) updateData.label = parsed.data.label
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder

    const effectiveType = (parsed.data.type ?? existing.type) as string
    const effectiveValue = (parsed.data.value ?? existing.value) as string
    if (parsed.data.value !== undefined || parsed.data.type !== undefined) {
      const valueError = validateContentValue(effectiveType, effectiveValue)
      if (valueError) {
        return NextResponse.json({ error: valueError }, { status: 400 })
      }
    }

    const item = await db.content.update({
      where: { key },
      data: updateData,
    })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'update', 'content', item.id, { key, ...updateData }, ip)

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Content update by key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE - Delete content by key */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canDelete = await hasPermission(session.role, 'canDeleteContent')
    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { key } = await context.params

    const existing = await db.content.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    await db.content.delete({ where: { key } })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'delete', 'content', existing.id, { key, value: existing.value }, ip)

    return NextResponse.json({ message: 'Content item deleted' })
  } catch (error) {
    console.error('Content delete by key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
