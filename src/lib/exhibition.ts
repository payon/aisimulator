'use client';

// 전시 모드: 오프라인 전시에 필요한 리소스를 미리 캐싱
// 홈/설정/CMS/아이콘 + 관리자가 등록한 체험 결과 이미지를 Cache Storage에 저장

const CORE_URLS = [
  '/',
  '/manifest.json',
  '/api/cms/content',
  '/api/config',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

export interface PrecacheProgress {
  done: number;
  total: number;
  ok: boolean;
}

export async function precacheExhibition(onStep?: (p: PrecacheProgress) => void): Promise<PrecacheProgress> {
  const urls = new Set<string>(CORE_URLS);

  // 체험 결과 이미지 URL 수집 (CMS)
  try {
    const res = await fetch('/api/cms/content', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const content: Record<string, string> = data.content || {};
      for (const [key, value] of Object.entries(content)) {
        if (
          (key.startsWith('mock.image.result.') || key.startsWith('mock.future.result.')) &&
          typeof value === 'string' &&
          value.trim()
        ) {
          urls.add(value.trim());
        }
      }
    }
  } catch { /* CMS 실패 시 코어만 캐싱 */ }

  const list = [...urls];
  const cache = await caches.open('ai-platform-dynamic-v1');
  let done = 0;
  for (const url of list) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) await cache.put(url, res.clone());
    } catch { /* 개별 실패 무시 */ }
    done++;
    onStep?.({ done, total: list.length, ok: true });
  }
  return { done, total: list.length, ok: true };
}
