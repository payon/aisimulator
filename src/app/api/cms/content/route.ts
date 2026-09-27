import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * PUBLIC content API for frontend consumption.
 * Returns all content as a flat key-value map.
 * No authentication required.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category } : {}

    const items = await db.content.findMany({
      where,
      select: {
        key: true,
        value: true,
        type: true,
        category: true,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })

    // Build a flat key-value map for easy frontend consumption
    const contentMap: Record<string, string> = {}
    const typedMap: Record<string, { value: string; type: string; category: string }> = {}

    for (const item of items) {
      contentMap[item.key] = item.value
      typedMap[item.key] = {
        value: item.value,
        type: item.type,
        category: item.category,
      }
    }

    return NextResponse.json(
      {
        content: contentMap,
        typed: typedMap,
        categories: [...new Set(items.map((i) => i.category))],
      },
      {
        headers: {
          // 클라이언트/SW에 구버전 고착 방지 — 항상 재검증
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    logger.error('Public content API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
