import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, hasPermission } from '@/lib/admin-auth'
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

/** GET - Get site config */
export async function GET(request: NextRequest) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageConfig')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const config = await db.siteConfig.findUnique({ where: { id: 'default' } })

    if (!config) {
      // Create default config if it doesn't exist
      const defaultConfig = await db.siteConfig.create({
        data: { id: 'default' },
      })
      return NextResponse.json({ config: defaultConfig })
    }

    return NextResponse.json({ config })
  } catch (error) {
    logger.error('Config get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT - Update site config */
export async function PUT(request: NextRequest) {
  try {
    const limited = adminLimited(request)
    if (limited) return limited
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const canManage = await hasPermission(session.role, 'canManageConfig')
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      siteName,
      siteDescription,
      logoUrl,
      faviconUrl,
      primaryColor,
      layoutMode,
      language,
      maintenanceMode,
      mockMode,
    } = body

    const updateData: Record<string, unknown> = {}
    if (siteName !== undefined) updateData.siteName = siteName
    if (siteDescription !== undefined) updateData.siteDescription = siteDescription
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl
    if (faviconUrl !== undefined) updateData.faviconUrl = faviconUrl
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor
    if (layoutMode !== undefined) updateData.layoutMode = layoutMode
    if (language !== undefined) updateData.language = language
    if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode
    if (mockMode !== undefined) updateData.mockMode = mockMode

    const config = await db.siteConfig.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    })

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    await logAction(session.userId, session.email, 'update', 'config', 'default', updateData, ip)

    return NextResponse.json({ config })
  } catch (error) {
    logger.error('Config update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
