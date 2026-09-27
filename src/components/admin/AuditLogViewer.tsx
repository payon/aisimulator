'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface AuditLogEntry {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: string | null;
  createdAt: string;
}

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

const ENTITY_LABELS: Record<string, string> = {
  content: '콘텐츠',
  user: '사용자',
  config: '설정',
  settings: '설정',
  permission: '권한',
};

const PAGE_SIZE = 20;

export default function AuditLogViewer() {
  const { authenticatedFetch } = useAdminAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (entityFilter !== 'all') params.set('entity', entityFilter);

      const res = await authenticatedFetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">감사 로그</h2>
        <p className="text-muted-foreground">시스템 변경 이력 추적</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">필터:</span>
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="작업 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 작업</SelectItem>
            <SelectItem value="create">생성</SelectItem>
            <SelectItem value="update">수정</SelectItem>
            <SelectItem value="delete">삭제</SelectItem>
            <SelectItem value="login">로그인</SelectItem>
            <SelectItem value="logout">로그아웃</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="엔티티 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 엔티티</SelectItem>
            <SelectItem value="content">콘텐츠</SelectItem>
            <SelectItem value="user">사용자</SelectItem>
            <SelectItem value="config">설정</SelectItem>
            <SelectItem value="permission">권한</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center">
          총 {total}건
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            감사 로그가 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3">
                  <button
                    className="w-full text-left"
                    onClick={() => log.changes && toggleExpand(log.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      {log.changes && (
                        <span className="shrink-0">
                          {expandedId === log.id ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </span>
                      )}
                      <Badge variant={ACTION_COLORS[log.action] || 'outline'} className="text-xs">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ENTITY_LABELS[log.entity] || log.entity}
                      </Badge>
                      <span className="text-sm font-medium">
                        {log.userEmail || '시스템'}
                      </span>
                      {log.entityId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(log.createdAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </button>
                  {expandedId === log.id && log.changes && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(log.changes), null, 2);
                          } catch {
                            return log.changes;
                          }
                        })()}
                      </pre>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
