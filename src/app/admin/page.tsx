import type { Metadata } from 'next';
import Link from 'next/link';
import { Crown, ArrowLeft } from 'lucide-react';
import AdminPanel from '@/components/admin/AdminPanel';

export const metadata: Metadata = {
  title: '관리자 대시보드',
  description: 'AI 플랫폼 관리자 전용 페이지',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 관리자 전용 헤더 */}
      <header className="border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">관리자 대시보드</h1>
              <p className="text-xs text-slate-400">AI 플랫폼 CMS · 시스템 관리</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">사용자 화면으로</span>
          </Link>
        </div>
      </header>
      {/* 관리자 패널 */}
      <div className="flex-1 overflow-hidden">
        <AdminPanel />
      </div>
    </div>
  );
}
