// TOTP (RFC 6238, 30초 스텝, 6자리) — 외부 의존성 없이 구현
import { randomBytes, createHmac } from 'crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;
const DIGITS = 6;

export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let out = '';
  let bits = 0;
  let value = 0;
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', secret).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** 현재 ±1 스텝 허용 검증 */
export function verifyTotp(secretB32: string, token: string, nowMs: number = Date.now()): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const secret = base32Decode(secretB32);
    if (secret.length === 0) return false;
    const counter = Math.floor(nowMs / 1000 / STEP);
    return [counter - 1, counter, counter + 1].some((c) => hotp(secret, c) === token);
  } catch {
    return false;
  }
}

export function totpAuthUrl(secretB32: string, account: string, issuer = 'AI플랫폼'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}
