import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, hasPermission, hashPassword, validatePasswordPolicy } from '@/lib/admin-auth'
import { logAction } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

function adminLimited(request: NextRequest) {
  const rl = checkAdminRateLimit(request)
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
  }
  return null
}

/** GET - List all admin users (never return passwordHash) */
export async function GET(request: NextRequest) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageUsers')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const users = await db.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    logger.error('Users list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST - Create new admin user */
export async function POST(request: NextRequest) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageUsers')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password, role, isActive } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    const policyError = validatePasswordPolicy(password)
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 })
    }

    // Check for duplicate email
    const existing = await db.adminUser.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await db.adminUser.create({
      data: {
        email,
        name,
        passwordHash,
        role: role ?? 'editor',
        isActive: isActive ?? true,
      },
    })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'create', 'user', user.id, { email, name, role: user.role }, ip)

    // Return without passwordHash
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('User create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT - Update admin user */
export async function PUT(request: NextRequest) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageUsers')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, email, name, password, role, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'User id is required' },
        { status: 400 }
      )
    }

    const existing = await db.adminUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If email is being changed, check for conflicts
    if (email && email !== existing.email) {
      const emailConflict = await db.adminUser.findUnique({ where: { email } })
      if (emailConflict) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Prevent demoting the last superadmin
    if (existing.role === 'superadmin' && role && role !== 'superadmin') {
      const superadminCount = await db.adminUser.count({ where: { role: 'superadmin' } })
      if (superadminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last superadmin' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (email !== undefined) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (typeof body.mustChangePassword === 'boolean') updateData.mustChangePassword = body.mustChangePassword
    if (password) {
      const policyError = validatePasswordPolicy(password)
      if (policyError) {
        return NextResponse.json({ error: policyError }, { status: 400 })
      }
      updateData.passwordHash = await hashPassword(password)
    }

    const user = await db.adminUser.update({
      where: { id },
      data: updateData,
    })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    // Don't log password in changes
    const safeChanges = { ...updateData }
    delete safeChanges.passwordHash
    await logAction(session.userId, session.email, 'update', 'user', user.id, safeChanges, ip)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    logger.error('User update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE - Delete admin user */
export async function DELETE(request: NextRequest) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageUsers')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'User id is required' },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const existing = await db.adminUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deleting last superadmin
    if (existing.role === 'superadmin') {
      const superadminCount = await db.adminUser.count({ where: { role: 'superadmin' } })
      if (superadminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last superadmin' },
          { status: 400 }
        )
      }
    }

    await db.adminUser.delete({ where: { id } })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'delete', 'user', id, { email: existing.email, name: existing.name, role: existing.role }, ip)

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    logger.error('User delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
