import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const startedAt = Date.now();

/** GET - 헬스체크 (compose healthcheck·모니터링용) */
export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'up';
  } catch {
    checks.database = 'down';
    ok = false;
  }
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      checks,
      version: process.env.APP_VERSION || 'dev',
    },
    { status: ok ? 200 : 503 }
  );
}
