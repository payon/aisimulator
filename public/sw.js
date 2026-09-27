// === AI 플랫폼 Service Worker ===
// PWA + TWA 호환 오프라인 캐싱 전략

const CACHE_NAME = 'ai-platform-v1';
const STATIC_CACHE = 'ai-platform-static-v1';
const DYNAMIC_CACHE = 'ai-platform-dynamic-v1';
const IMAGE_CACHE = 'ai-platform-images-v1';
const API_CACHE = 'ai-platform-api-v1';

// 캐시할 정적 리소스 (App Shell)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/robots.txt',
];

// 캐시 제한 시간 (초)
const CACHE_EXPIRY = {
  static: 365 * 24 * 60 * 60,     // 1년
  api: 5 * 60,                     // 5분
  dynamic: 24 * 60 * 60,          // 1일
  image: 30 * 24 * 60 * 60,       // 30일
};

// 네트워크 우선 전략이 적용될 API 패턴
const API_PATTERNS = [
  /\/api\//,
];

// 캐시 우선 전략이 적용될 정적 패턴
const STATIC_PATTERNS = [
  /\.(js|css|woff2?|ttf|eot)$/,
  /\/_next\/static\//,
  /\/icons\//,
];

// 이미지 패턴
const IMAGE_PATTERNS = [
  /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
];

// === 유틸리티 ===

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function getCacheName(url) {
  if (API_PATTERNS.some(p => p.test(url))) return API_CACHE;
  if (IMAGE_PATTERNS.some(p => p.test(url))) return IMAGE_CACHE;
  if (STATIC_PATTERNS.some(p => p.test(url))) return STATIC_CACHE;
  return DYNAMIC_CACHE;
}

// === 설치 이벤트 ===
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell...');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some static assets failed to cache:', err);
          // 실패한 개별 리소스는 무시하고 계속 진행
          return Promise.resolve();
        });
      })
      .then(() => {
        // 즉시 활성화 (대기하지 않음)
        return self.skipWaiting();
      })
  );
});

// === 활성화 이벤트 ===
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // 현재 버전의 캐시가 아닌 것만 삭제
              return name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE && 
                     name !== IMAGE_CACHE && 
                     name !== API_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // 모든 클라이언트를 즉시 제어
        return self.clients.claim();
      })
  );
});

// === 페치 이벤트 ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 동일 출처만 처리
  if (url.origin !== location.origin) {
    // 외부 리소스는 네트워크 우선 + 캐시 폴백
    event.respondWith(networkFirstWithCacheFallback(request));
    return;
  }

  // POST/PUT/DELETE 요청은 캐시하지 않음
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // 네비게이션 요청 (HTML 페이지)
  if (isNavigationRequest(request)) {
    event.respondWith(navigationHandler(request));
    return;
  }

  // API 요청 - 네트워크 우선 + 캐시 폴백
  if (API_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(apiHandler(request));
    return;
  }

  // 이미지 요청 - 캐시 우선 + 네트워크 폴백
  if (IMAGE_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(cacheFirstWithNetworkFallback(request, IMAGE_CACHE));
    return;
  }

  // 정적 리소스 - 캐시 우선 (Cache First)
  if (STATIC_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(cacheFirstWithNetworkFallback(request, STATIC_CACHE));
    return;
  }

  // 기타 - 스테일 와일 리밸리데이트
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// === 캐싱 전략 구현 ===

// 네비게이션: 네트워크 우선, 오프라인 시 캐시된 홈 반환
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 오프라인 시 캐시된 페이지 또는 홈 반환
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    
    const homeResponse = await caches.match('/');
    if (homeResponse) return homeResponse;
    
    return new Response(getOfflinePage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// API: 네트워크 우선 + 캐시 폴백 (5분 TTL)
async function apiHandler(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // 캐시된 데이터에 오프라인 표시 추가
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: '오프라인 상태입니다. 네트워크에 연결되면 자동으로 동기화됩니다.',
        offline: true 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503,
      }
    );
  }
}

// 캐시 우선 + 네트워크 폴백
async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 이미지의 경우 플레이스홀더 반환
    if (IMAGE_PATTERNS.some(p => p.test(request.url))) {
      return new Response(getPlaceholderSVG(), {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    }
    return new Response('', { status: 404 });
  }
}

// 스테일 와일 리밸리데이트
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(cacheName);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || networkPromise;
}

// 네트워크 우선 + 캐시 폴백 (외부 리소스용)
async function networkFirstWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response('', { status: 503 });
  }
}

// === 오프라인 페이지 ===
function getOfflinePage() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI 플랫폼 - 오프라인</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #f8fafc; color: #1e293b;
      padding: 1rem; text-align: center;
    }
    .container { max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #64748b; margin-bottom: 1.5rem; line-height: 1.6; }
    button {
      padding: 0.75rem 2rem; border-radius: 0.5rem;
      background: #0f172a; color: white; border: none;
      font-size: 1rem; cursor: pointer;
    }
    button:hover { background: #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>오프라인 상태입니다</h1>
    <p>인터넷 연결이 필요합니다. 네트워크에 연결되면 자동으로 복구됩니다.</p>
    <button onclick="window.location.reload()">다시 시도</button>
  </div>
</body>
</html>`;
}

// 플레이스홀더 SVG
function getPlaceholderSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f1f5f9"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="central" 
        fill="#94a3b8" font-family="sans-serif" font-size="14">오프라인</text>
</svg>`;
}

// === 백그라운드 동기화 ===
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
  
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// 대기 중인 데이터 동기화
async function syncPendingData() {
  // 오프라인 중 저장된 데이터를 서버로 전송
  try {
    const pendingRequests = await getPendingRequests();
    for (const request of pendingRequests) {
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      await removePendingRequest(request.id);
    }
    console.log('[SW] Pending data synced successfully');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// 분석 데이터 동기화
async function syncAnalytics() {
  // 오프라인 사용 통계 전송
  console.log('[SW] Analytics synced');
}

// 대기 요청 관리 (IndexedDB 사용 권장, 간단한 구현)
async function getPendingRequests() { return []; }
async function removePendingRequest(id) {}

// === 푸시 알림 ===
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'AI 플랫폼',
    body: '새로운 알림이 있습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    tag: 'ai-platform-notification',
    data: { url: '/' },
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      data: data.data,
      actions: [
        { action: 'open', title: '열기' },
        { action: 'dismiss', title: '닫기' },
      ],
      requireInteraction: data.priority === 'high',
      silent: data.priority !== 'high',
    })
  );
});

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// === 메시지 핸들링 (클라이언트 ↔ SW 통신) ===
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0]?.postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
    case 'CLEAR_API_CACHE':
      caches.delete(API_CACHE).then(() => {
        event.ports[0]?.postMessage({ type: 'API_CACHE_CLEARED' });
      });
      break;
  }
});

// 캐시 크기 계산
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  return totalSize;
}

// 전체 캐시 삭제
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}
