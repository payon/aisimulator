import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "https://preview-chat-f6f17a92-a12b-4c72-b199-aa544a20aab2.space-z.ai",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://21.0.16.131:3000",
    "http://localhost:81",
    "http://localhost:3300",
    "http://127.0.0.1:3300",
    "https://rustkorea.cloud",
    "http://rustkorea.cloud",
  ],
  // PWA 및 TWA 지원을 위한 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Service Worker 허용
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          // HSTS (TWA에 필수 - HTTPS 강제)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // 클릭재킹 방지
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy (Next.js 인라인 스크립트 허용 범위 내)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://z-cdn.chatglm.cn",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "media-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // manifest.json CORS 허용
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        // Service Worker 캐싱 방지 (항상 최신 SW 가져오기)
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      {
        // Digital Asset Links (TWA 인증용)
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        // PWA 아이콘 캐싱 (장기 캐시)
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
