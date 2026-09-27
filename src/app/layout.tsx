import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Radix UI hydration mismatch 경고 억제 (서버/클라이언트 ID 불일치)
import "@/lib/suppress-hydration-warnings";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// PWA Viewport 설정
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "AI 플랫폼 - 다중 AI 제공자 통합",
  description: "AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요. OpenAI, Gemini, Grok, Claude를 하나의 플랫폼에서 사용하세요.",
  keywords: ["AI", "인공지능", "OpenAI", "Gemini", "Grok", "Claude", "AI 대화", "이미지 변환", "AI 퀴즈"],
  authors: [{ name: "AI 플랫폼" }],
  
  // PWA Manifest
  manifest: "/manifest.json",
  
  // 아이콘 (PWA + Favicon)
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Apple PWA 메타
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI 플랫폼",
  },
  
  // Microsoft PWA
  msapplication: {
    TileColor: "#0f172a",
    TileImage: "/icons/icon-144x144.png",
  },
  
  // Open Graph (소셜 공유)
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: "AI 플랫폼 - 다중 AI 제공자 통합",
    description: "AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.",
    siteName: "AI 플랫폼",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "AI 플랫폼",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary",
    title: "AI 플랫폼 - 다중 AI 제공자 통합",
    description: "AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.",
    images: ["/icons/icon-512x512.png"],
  },
  
  // PWA 관련 추가 메타
  other: {
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
  
  // Robot 설정
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* PWA: 서비스 워커 등록 (클라이언트에서 처리하므로 여기서는 메타만) */}
        {/* TWA: Digital Asset Links 확인용 */}
        <link rel="preconnect" href="https://z-cdn.chatglm.cn" />
      </head>
      <body
        className={`${notoSansKR.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
