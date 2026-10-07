'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

interface AnalyticsData {
  total: number;
  daily: { day: string; count: number }[];
  byAction: { name: string; count: number }[];
  byEntity: { name: string; count: number }[];
}

// UserActivity 영문 액션/엔티티 → 한글 표시 (DB 값은 그대로, 화면에만 매핑)
const ACTION_LABELS: Record<string, string> = {
  chat_message: 'AI 대화',
  practice_message: '질문 체험',
  quiz_start: '퀴즈 시작',
  image_transform: '이미지 변환',
  future_generate: '미래 모습 생성',
  page_view: '페이지 조회',
};

const ENTITY_LABELS: Record<string, string> = {
  chat: 'AI 대화',
  practice: '질문 체험',
  quiz: '퀴즈',
  image: '이미지 변환',
  future: '미래의 나',
  admin: '관리자',
  settings: '설정',
  content: '콘텐츠',
};

function localize(list: { name: string; count: number }[], labels: Record<string, string>) {
  return list.map((item) => ({ ...item, name: labels[item.name] ?? item.name }));
}

export default function AnalyticsPanel() {
  const { authenticatedFetch } = useAdminAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/admin/analytics');
      if (res.ok) {
        const raw = await res.json();
        setData({
          ...raw,
          byAction: localize(raw.byAction || [], ACTION_LABELS),
          byEntity: localize(raw.byEntity || [], ENTITY_LABELS),
        });
      } else if (res.status !== 401) {
        toast.error('분석 데이터를 불러오지 못했습니다.');
      }
    } catch {
      toast.error('분석 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">사용량 분석</h2>
        <Badge variant="secondary">최근 14일</Badge>
        {data && <Badge variant="outline">총 {data.total}건</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">일별 활동</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.daily || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">액션별 TOP 10</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byAction || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f172a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기능별 TOP 10</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byEntity || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#475569" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
