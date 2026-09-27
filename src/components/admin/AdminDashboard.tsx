'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Users,
  MessageSquare,
  Trophy,
  ImageIcon,
  Activity,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  users: { total: number; active: number };
  content: { total: number; byCategory: { category: string; count: number }[] };
  chat: { totalSessions: number; totalMessages: number; recentSessions: number };
  quiz: { total: number; byDifficulty: { difficulty: string; count: number }[]; averageScore: number };
  images: { total: number };
  audit: { total: number; recent: AuditLogEntry[] };
  sessions: { activeAdminSessions: number };
}

interface AuditLogEntry {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
}

interface ActivityData {
  date: string;
  count: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

const ACTION_LABELS: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  login: '로그인',
  logout: '로그아웃',
};

const ACTION_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  login: 'outline',
  logout: 'outline',
};

export default function AdminDashboard() {
  const { authenticatedFetch } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, logsRes] = await Promise.all([
          authenticatedFetch('/api/admin/stats'),
          authenticatedFetch('/api/admin/audit?limit=5'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
          // Generate activity chart data from content by category
          if (statsData.content?.byCategory) {
            setActivityData(
              statsData.content.byCategory.map((c: { category: string; count: number }) => ({
                date: c.category,
                count: c.count,
              }))
            );
          }
          // Use recent audit logs from stats
          if (statsData.audit?.recent) {
            setRecentLogs(statsData.audit.recent);
          }
        }

        if (logsRes.ok) {
          const logsData = await logsRes.json();
          // API returns { logs, pagination }
          if (logsData.logs && logsData.logs.length > 0) {
            setRecentLogs(logsData.logs);
          }
        }
      } catch {
        // Silently handle - stats will remain null
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authenticatedFetch]);

  const statCards = [
    { label: '콘텐츠 항목', value: stats?.content?.total ?? 0, icon: FileText, color: 'text-emerald-600' },
    { label: '사용자', value: stats?.users?.total ?? 0, icon: Users, color: 'text-amber-600' },
    { label: '채팅 세션', value: stats?.chat?.totalSessions ?? 0, icon: MessageSquare, color: 'text-sky-600' },
    { label: '퀴즈 결과', value: stats?.quiz?.total ?? 0, icon: Trophy, color: 'text-violet-600' },
    { label: '이미지 기록', value: stats?.images?.total ?? 0, icon: ImageIcon, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
        <p className="text-muted-foreground">시스템 현황 및 최근 활동</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                카테고리별 콘텐츠
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  아직 활동 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Audit Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                최근 감사 로그
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <Skeleton key={n} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentLogs.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant={ACTION_COLORS[log.action] || 'outline'}>
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {log.userEmail || '시스템'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.entity} {log.entityId && `#${log.entityId.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(log.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  감사 로그가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
