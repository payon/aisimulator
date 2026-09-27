import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, hasPermission } from '@/lib/admin-auth'
import { logAction } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/rate-limit'
import { createContentSchema, updateContentSchema, validateContentValue } from '@/lib/cms-validate'
import { recordContentVersion } from '@/lib/versions'
import { logger } from '@/lib/logger'

function adminLimited(request: NextRequest) {
  const rl = checkAdminRateLimit(request)
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
  }
  return null
}

/** GET - List all content items, supports ?category= filter */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category } : {}

    const items = await db.content.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    logger.error('Content list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST - Create new content item */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = createContentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' },
        { status: 400 }
      )
    }
    const { key, category, type, value, label, description, sortOrder } = parsed.data

    const valueError = validateContentValue(type, value)
    if (valueError) {
      return NextResponse.json({ error: valueError }, { status: 400 })
    }

    // Check for duplicate key
    const existing = await db.content.findUnique({ where: { key } })
    if (existing) {
      return NextResponse.json(
        { error: 'Content with this key already exists' },
        { status: 409 }
      )
    }

    const item = await db.content.create({
      data: {
        key,
        category: category ?? 'general',
        type: type ?? 'text',
        value,
        label: label ?? null,
        description: description ?? null,
        sortOrder: sortOrder ?? 0,
        updatedBy: session.email,
      },
    })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'create', 'content', item.id, { key, category, value }, ip)

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    logger.error('Content create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT - Update content item by id */
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const parsed = updateContentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' },
        { status: 400 }
      )
    }
    const { id, key, category, type, value, label, description, sortOrder } = parsed.data

    const existing = await db.content.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    // If key is being changed, check for conflicts
    if (key && key !== existing.key) {
      const keyConflict = await db.content.findUnique({ where: { key } })
      if (keyConflict) {
        return NextResponse.json(
          { error: 'Content with this key already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = { updatedBy: session.email }
    if (key !== undefined) updateData.key = key
    if (category !== undefined) updateData.category = category
    if (type !== undefined) updateData.type = type
    if (value !== undefined) updateData.value = value
    if (label !== undefined) updateData.label = label
    if (description !== undefined) updateData.description = description
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    // 타입별 값 가드 (최종 effective type/value 기준)
    const effectiveType = (type ?? existing.type) as string
    const effectiveValue = (value ?? existing.value) as string
    if (value !== undefined || type !== undefined) {
      const valueError = validateContentValue(effectiveType, effectiveValue)
      if (valueError) {
        return NextResponse.json({ error: valueError }, { status: 400 })
      }
    }

    const item = await db.content.update({
      where: { id },
      data: updateData,
    })

    // 값 변경 시 버전 스냅샷 기록
    if (value !== undefined) {
      await recordContentVersion(item.id, item.key, existing.value, value, session.email)
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'update', 'content', item.id, updateData, ip)

    return NextResponse.json({ item })
  } catch (error) {
    logger.error('Content update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE - Delete content item by id */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Content id is required' },
        { status: 400 }
      )
    }

    const existing = await db.content.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    await db.content.delete({ where: { id } })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'delete', 'content', id, { key: existing.key, value: existing.value }, ip)

    return NextResponse.json({ message: 'Content item deleted' })
  } catch (error) {
    logger.error('Content delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
