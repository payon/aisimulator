// 서버 부팅 시 1회 실행: 감사 로그 보존 정책 (매일 1회 prune)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const days = Number(process.env.AUDIT_RETENTION_DAYS || 365);
    if (!Number.isFinite(days) || days <= 0) return;
    const { pruneAuditLogs } = await import('@/lib/retention');
    // 부팅 1분 후 1회 + 이후 24시간 간격
    const run = () => {
      pruneAuditLogs(days).catch((e) => console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'audit prune failed', error: String(e) })));
    };
    setTimeout(run, 60_000);
    setInterval(run, 24 * 60 * 60 * 1000);
  }
}
