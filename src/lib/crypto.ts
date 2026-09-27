// AES-256-GCM 대칭 암호화 (API 키·TOTP 시크릿·VAPID 비공개키 저장용)
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ALG = 'aes-256-gcm';
const PREFIX = 'enc1:';

function getKey(): Buffer {
  const secret = process.env.API_KEY_SECRET;
  if (secret && secret.length >= 16) {
    return createHash('sha256').update(secret).digest();
  }
  // 개발 폴백 (프로덕션에서는 반드시 API_KEY_SECRET 설정)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('API_KEY_SECRET is required in production');
  }
  return createHash('sha256').update('dev-only-insecure-key').digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // 레거시 평문 (읽기 시 허용, 저장 시 암호화)
  try {
    const body = stored.slice(PREFIX.length);
    const parts = body.split('.');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const data = Buffer.from(parts[2], 'base64');
    if (iv.length !== 12 || tag.length !== 16 || data.length === 0) return null;
    const decipher = createDecipheriv(ALG, getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(PREFIX);
}
