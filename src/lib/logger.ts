// 구조화(JSON) 서버 로거 — console 산발 호출 대체용
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, extra?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...extra,
  };
  const out = JSON.stringify(line);
  if (level === 'error' || level === 'warn') console.error(out);
  else console.log(out);
}

export const logger = {
  debug: (msg: string, extra?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', msg, extra);
  },
  info: (msg: string, extra?: Record<string, unknown>) => emit('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emit('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emit('error', msg, extra),
};
