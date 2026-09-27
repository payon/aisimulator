import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, getActiveSessionCount } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

/** GET - Return dashboard statistics */
export async function GET(request: NextRequest) {
  try {
    const session = authenticateRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Any authenticated admin can view stats
    const [
      totalUsers,
      activeUsers,
      totalContent,
      totalChatSessions,
      totalChatMessages,
      totalQuizResults,
      totalImageHistory,
      totalAuditLogs,
      recentSessions,
      recentQuizResults,
    ] = await Promise.all([
      db.adminUser.count(),
      db.adminUser.count({ where: { isActive: true } }),
      db.content.count(),
      db.chatSession.count(),
      db.chatMessage.count(),
      db.quizResult.count(),
      db.imageHistory.count(),
      db.auditLog.count(),
      // Recent activity - last 7 days
      db.chatSession.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      db.quizResult.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Content by category
    const contentByCategory = await db.content.groupBy({
      by: ['category'],
      _count: { category: true },
    })

    // Quiz results by difficulty
    const quizByDifficulty = await db.quizResult.groupBy({
      by: ['difficulty'],
      _count: { difficulty: true },
    })

    // Average quiz score
    const quizAgg = await db.quizResult.aggregate({
      _avg: { score: true, total: true },
    })

    // Recent audit logs (last 5)
    const recentAuditLogs = await db.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entity: true,
        userEmail: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      content: {
        total: totalContent,
        byCategory: contentByCategory.map((c) => ({
          category: c.category,
          count: c._count.category,
        })),
      },
      chat: {
        totalSessions: totalChatSessions,
        totalMessages: totalChatMessages,
        recentSessions,
      },
      quiz: {
        total: totalQuizResults,
        byDifficulty: quizByDifficulty.map((q) => ({
          difficulty: q.difficulty,
          count: q._count.difficulty,
        })),
        averageScore: quizAgg._avg.score ?? 0,
        averageTotal: quizAgg._avg.total ?? 0,
        recentResults: recentQuizResults,
      },
      images: {
        total: totalImageHistory,
      },
      audit: {
        total: totalAuditLogs,
        recent: recentAuditLogs,
      },
      sessions: {
        activeAdminSessions: getActiveSessionCount(),
      },
    })
  } catch (error) {
    logger.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
