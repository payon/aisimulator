import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, hasPermission } from '@/lib/admin-auth'
import { logAction } from '@/lib/audit'
import { logger } from '@/lib/logger'

/** GET - List all roles with permissions */
export async function GET(request: NextRequest) {
  try {
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageUsers')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const roles = await db.permission.findMany({
      orderBy: { role: 'asc' },
    })

    return NextResponse.json({ roles })
  } catch (error) {
    logger.error('Roles list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT - Update role permissions */
export async function PUT(request: NextRequest) {
  try {
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Only superadmin can manage permissions
    if (session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmin can manage permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { role, canManageUsers, canManageContent, canManageConfig, canViewAudit, canDeleteContent, canManageAPIKeys } = body

    if (!role) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    // Prevent modifying superadmin permissions
    if (role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot modify superadmin permissions' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (canManageUsers !== undefined) updateData.canManageUsers = canManageUsers
    if (canManageContent !== undefined) updateData.canManageContent = canManageContent
    if (canManageConfig !== undefined) updateData.canManageConfig = canManageConfig
    if (canViewAudit !== undefined) updateData.canViewAudit = canViewAudit
    if (canDeleteContent !== undefined) updateData.canDeleteContent = canDeleteContent
    if (canManageAPIKeys !== undefined) updateData.canManageAPIKeys = canManageAPIKeys

    // Upsert: create if doesn't exist, update if it does
    const permission = await db.permission.upsert({
      where: { role },
      update: updateData,
      create: {
        role,
        canManageUsers: canManageUsers ?? false,
        canManageContent: canManageContent ?? true,
        canManageConfig: canManageConfig ?? false,
        canViewAudit: canViewAudit ?? false,
        canDeleteContent: canDeleteContent ?? false,
        canManageAPIKeys: canManageAPIKeys ?? false,
      },
    })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'update', 'settings', permission.id, { role, ...updateData }, ip)

    return NextResponse.json({ permission })
  } catch (error) {
    logger.error('Role update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
