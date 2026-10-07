import { z } from 'zod';

export const CONTENT_KEY_RE = /^[a-z0-9]+(\.[a-z0-9_-]+)+$/i;
export const CONTENT_TYPES = ['text', 'image', 'rich_text', 'json', 'color', 'url'] as const;
export const CONTENT_CATEGORIES = [
  'home',
  'chat',
  'image',
  'future',
  'quiz',
  'guide',
  'practice',
  'settings',
  'global',
  'nav',
  'general',
  'mock',
  'kiosk',
] as const;

export const MAX_VALUE_LEN = 50_000;
export const MAX_LABEL_LEN = 200;
export const MAX_DESC_LEN = 1000;

const keySchema = z
  .string()
  .min(3)
  .max(120)
  .regex(CONTENT_KEY_RE, '키는 {category}.{section}.{field} 형식이어야 합니다 (예: home.hero.title)');

const valueSchema = z.string().min(1).max(MAX_VALUE_LEN);

export const createContentSchema = z.object({
  key: keySchema,
  category: z.enum(CONTENT_CATEGORIES),
  type: z.enum(CONTENT_TYPES),
  value: valueSchema,
  label: z.string().max(MAX_LABEL_LEN).nullish(),
  description: z.string().max(MAX_DESC_LEN).nullish(),
  sortOrder: z.number().int().min(0).max(9999).nullish(),
});

export const updateContentSchema = z.object({
  id: z.string().min(1),
  key: keySchema.optional(),
  category: z.enum(CONTENT_CATEGORIES).optional(),
  type: z.enum(CONTENT_TYPES).optional(),
  value: valueSchema.optional(),
  label: z.string().max(MAX_LABEL_LEN).nullable().optional(),
  description: z.string().max(MAX_DESC_LEN).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateContentByKeySchema = z.object({
  category: z.enum(CONTENT_CATEGORIES).optional(),
  type: z.enum(CONTENT_TYPES).optional(),
  value: valueSchema.optional(),
  label: z.string().max(MAX_LABEL_LEN).nullable().optional(),
  description: z.string().max(MAX_DESC_LEN).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

// 저장형 XSS / 스킴 가드
const DANGEROUS_VALUE_PATTERNS = [
  /<script[\s>]/i,
  /<\/script\s*>/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /on\w+\s*=\s*["']/i, // onclick=, onerror= 등
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
];

const ALLOWED_URL_SCHEMES = ['http://', 'https://', 'data:image/'];

export function findDangerousPattern(value: string): string | null {
  for (const p of DANGEROUS_VALUE_PATTERNS) {
    if (p.test(value)) return p.source;
  }
  return null;
}

/** url/image 타입 스킴 검증 */
export function isAllowedUrlValue(type: string, value: string): boolean {
  if (type !== 'url' && type !== 'image') return true;
  const v = value.trim();
  // 상대경로(/images/..., /uploads/...) 허용
  if (v.startsWith('/')) return true;
  const lower = v.toLowerCase();
  // 이미지는 http(s) 또는 data:image만 허용 (SVG의 script 내장 차단)
  if (type === 'image') {
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    if (lower.startsWith('data:image/jpeg;') || lower.startsWith('data:image/png;') || lower.startsWith('data:image/webp;')) return true;
    return false;
  }
  return ALLOWED_URL_SCHEMES.some((s) => lower.startsWith(s));
}

/** color 타입 검증 (#rgb/#rrggbb) */
export function isValidColorValue(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** 타입별 값 검증. 실패 시 에러 메시지 반환, 성공 시 null */
export function validateContentValue(type: string, value: string): string | null {
  const dangerous = findDangerousPattern(value);
  if (dangerous) return `허용되지 않은 패턴이 포함되어 있습니다 (${dangerous})`;
  if (!isAllowedUrlValue(type, value)) {
    return type === 'image'
      ? '이미지는 https://, /상대경로, data:image/jpeg|png|webp만 허용됩니다'
      : 'URL은 https://, http://, /상대경로만 허용됩니다';
  }
  if (type === 'color' && !isValidColorValue(value)) {
    return '색상은 #RGB 또는 #RRGGBB 형식이어야 합니다';
  }
  if (type === 'json') {
    try {
      JSON.parse(value);
    } catch {
      return '올바른 JSON 형식이 아닙니다';
    }
  }
  return null;
}

// 이미지 data-URL 서버측 검증 (AI 변환/업로드 공용)
const ALLOWED_IMAGE_DATA_PREFIX = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImageDataUrl(imageData: unknown): { valid: boolean; error?: string } {
  if (typeof imageData !== 'string' || imageData.length === 0) {
    return { valid: false, error: '이미지 데이터가 필요합니다.' };
  }
  const lower = imageData.slice(0, 64).toLowerCase();
  const matched = ALLOWED_IMAGE_DATA_PREFIX.some((p) => lower.startsWith(p));
  if (!matched) {
    return { valid: false, error: 'JPG, PNG, WebP data-URL만 허용됩니다 (SVG/GIF 차단).' };
  }
  const b64 = imageData.split(',')[1] || '';
  // base64 길이 → 바이트 근사치
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    return { valid: false, error: '이미지 크기는 10MB 이하여야 합니다.' };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(b64.slice(0, 4096))) {
    return { valid: false, error: '이미지 데이터 형식이 올바르지 않습니다.' };
  }
  return { valid: true };
}
