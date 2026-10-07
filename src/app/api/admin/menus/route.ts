import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { logAction } from '@/lib/audit';
import { findDangerousPattern } from '@/lib/cms-validate';
import { TABS } from '@/types';
import { NAV_ORDER_KEY, NAV_HIDDEN_KEY, navLabelKey } from '@/lib/menu';
import { logger } from '@/lib/logger';

const VALID_IDS: string[] = TABS.map((t) => t.id);
const MAX_LABEL_LEN = 30;

function adminLimited(request: NextRequest) {
  const rl = checkAdminRateLimit(request);
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }
  return null;
}

async function checkManage(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  const canManage = await hasPermission(session.role, 'canManageContent');
  if (!canManage) return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
  return { session };
}

/**
 * GET /api/admin/menus — 메뉴 설정 조회 { order, hidden, labels }
 * (읽기는 공개 CMS에도 포함되지만, 관리자 UI는 이 엔드포인트 사용)
 */
export async function GET(request: NextRequest) {
  const limited = adminLimited(request);
  if (limited) return limited;
  const auth = await checkManage(request);
  if (auth.error) return auth.error;

  const items = await db.content.findMany({
    where: { key: { startsWith: 'nav.' } },
    select: { key: true, value: true },
  });
  const map = new Map(items.map((i) => [i.key, i.value]));
  const labels: Record<string, string> = {};
  for (const id of VALID_IDS) {
    const v = map.get(navLabelKey(id));
    if (v !== undefined) labels[id] = v;
  }
  return NextResponse.json({
    order: map.get(NAV_ORDER_KEY) ?? '',
    hidden: map.get(NAV_HIDDEN_KEY) ?? '',
    labels,
  });
}

/**
 * POST /api/admin/menus — 메뉴 설정 저장 (upsert)
 * body: { order: TabId[], hidden: TabId[], labels: Record<TabId, string> }
 * 빈 라벨은 키 삭제 (= 기본 이름으로 폴백)
 */
export async function POST(request: NextRequest) {
  const limited = adminLimited(request);
  if (limited) return limited;
  const auth = await checkManage(request);
  if (auth.error || !auth.session) return auth.error;
  const session = auth.session;

  try {
    const body = await request.json();
    const { order, hidden, labels } = body;

    if (!Array.isArray(order) || !Array.isArray(hidden) || typeof labels !== 'object' || labels === null) {
      return NextResponse.json({ error: 'order(hidden 배열)와 labels(객체)가 필요합니다.' }, { status: 400 });
    }
    if (!order.every((id) => typeof id === 'string' && VALID_IDS.includes(id))) {
      return NextResponse.json({ error: 'order에 알 수 없는 메뉴가 포함되어 있습니다.' }, { status: 400 });
    }
    if (!hidden.every((id) => typeof id === 'string' && VALID_IDS.includes(id))) {
      return NextResponse.json({ error: 'hidden에 알 수 없는 메뉴가 포함되어 있습니다.' }, { status: 400 });
    }
    // 전부 숨김 방지
    if (new Set(hidden).size >= VALID_IDS.length) {
      return NextResponse.json({ error: '모든 메뉴를 숨길 수는 없습니다. 최소 1개는 표시해야 합니다.' }, { status: 400 });
    }
    for (const [id, label] of Object.entries(labels)) {
      if (!VALID_IDS.includes(id)) {
        return NextResponse.json({ error: `알 수 없는 메뉴입니다: ${id}` }, { status: 400 });
      }
      if (typeof label !== 'string' || label.length > MAX_LABEL_LEN) {
        return NextResponse.json({ error: `메뉴 이름은 ${MAX_LABEL_LEN}자 이내여야 합니다.` }, { status: 400 });
      }
      const bad = label ? findDangerousPattern(label) : null;
      if (bad) {
        return NextResponse.json({ error: `메뉴 이름에 허용되지 않은 패턴이 포함되어 있습니다 (${bad})` }, { status: 400 });
      }
    }

    const savedKeys: string[] = [];

    // 순서·숨김은 항상 저장 (기본 순서와 같아도 명시 저장 → 차후 메뉴 추가 시 병합 기준 유지)
    for (const [key, value] of [
      [NAV_ORDER_KEY, JSON.stringify([...new Set(order)])],
      [NAV_HIDDEN_KEY, JSON.stringify([...new Set(hidden)])],
    ] as const) {
      await db.content.upsert({
        where: { key },
        create: {
          key, value, category: 'nav', type: 'json',
          label: key === NAV_ORDER_KEY ? '메뉴 순서' : '숨긴 메뉴',
          description: '메뉴 관리에서 저장한 값 (프론트 즉시 반영)',
          updatedBy: session.userId,
        },
        update: { value, updatedBy: session.userId },
      });
      savedKeys.push(key);
    }

    // 라벨: 비어 있으면 키 삭제(기본 이름 폴백), 있으면 upsert
    for (const id of VALID_IDS) {
      const label = (labels as Record<string, string>)[id];
      if (label === undefined) continue;
      const key = navLabelKey(id);
      if (!label.trim()) {
        await db.content.deleteMany({ where: { key } });
      } else {
        await db.content.upsert({
          where: { key },
          create: {
            key, value: label.trim(), category: 'nav', type: 'text',
            label: `메뉴 이름: ${id}`,
            description: '메뉴 관리에서 저장한 표시 이름',
            updatedBy: session.userId,
          },
          update: { value: label.trim(), updatedBy: session.userId },
        });
      }
      savedKeys.push(key);
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'update', 'nav', 'menu', { savedKeys }, ip);

    return NextResponse.json({ success: true, savedKeys });
  } catch (error) {
    logger.error('Menus save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/menus — 순서·숨김 초기화 (라벨은 유지) */
export async function DELETE(request: NextRequest) {
  const limited = adminLimited(request);
  if (limited) return limited;
  const auth = await checkManage(request);
  if (auth.error || !auth.session) return auth.error;
  const session = auth.session;

  const result = await db.content.deleteMany({
    where: { key: { in: [NAV_ORDER_KEY, NAV_HIDDEN_KEY] } },
  });
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
  await logAction(session.userId, session.email, 'update', 'nav', 'menu', { action: 'reset-order' }, ip);
  return NextResponse.json({ success: true, deletedCount: result.count });
}
