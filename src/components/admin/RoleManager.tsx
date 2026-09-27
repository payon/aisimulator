'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

interface PermissionSet {
  id: string;
  role: string;
  canManageUsers: boolean;
  canManageContent: boolean;
  canManageConfig: boolean;
  canViewAudit: boolean;
  canDeleteContent: boolean;
  canManageAPIKeys: boolean;
}

const ROLES = ['superadmin', 'admin', 'editor', 'viewer'] as const;

const ROLE_LABELS: Record<string, string> = {
  superadmin: '슈퍼관리자',
  admin: '관리자',
  editor: '편집자',
  viewer: '조회자',
};

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  superadmin: 'destructive',
  admin: 'default',
  editor: 'secondary',
  viewer: 'outline',
};

const PERMISSION_LABELS: Record<string, string> = {
  canManageUsers: '사용자 관리',
  canManageContent: '콘텐츠 관리',
  canManageConfig: '설정 관리',
  canViewAudit: '감사 로그 조회',
  canDeleteContent: '콘텐츠 삭제',
  canManageAPIKeys: 'API 키 관리',
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof Omit<PermissionSet, 'id' | 'role'>)[];

export default function RoleManager() {
  const { authenticatedFetch } = useAdminAuth();
  const [permissions, setPermissions] = useState<PermissionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // role being saved
  const [changed, setChanged] = useState(false);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
      }
    } catch {
      toast.error('권한 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const togglePermission = (roleId: string, permKey: string) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === roleId
          ? { ...p, [permKey]: !p[permKey as keyof PermissionSet] }
          : p
      )
    );
    setChanged(true);
  };

  const handleSave = async (role: string) => {
    const perm = permissions.find((p) => p.role === role);
    if (!perm) return;

    setSaving(role);
    try {
      const res = await authenticatedFetch(`/api/admin/permissions/${perm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          canManageUsers: perm.canManageUsers,
          canManageContent: perm.canManageContent,
          canManageConfig: perm.canManageConfig,
          canViewAudit: perm.canViewAudit,
          canDeleteContent: perm.canDeleteContent,
          canManageAPIKeys: perm.canManageAPIKeys,
        }),
      });
      if (res.ok) {
        toast.success(`${ROLE_LABELS[role]} 권한이 저장되었습니다.`);
        setChanged(false);
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">권한 관리</h2>
        <p className="text-muted-foreground">역할별 권한 설정</p>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Permission Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                권한 매트릭스
              </CardTitle>
              <CardDescription>각 역할에 대한 권한을 확인하고 수정할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        권한
                      </th>
                      {ROLES.map((role) => (
                        <th key={role} className="text-center py-3 px-4 text-sm font-medium">
                          <Badge variant={ROLE_COLORS[role]}>
                            {ROLE_LABELS[role]}
                          </Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_KEYS.map((permKey) => (
                      <tr key={permKey} className="border-b last:border-0">
                        <td className="py-3 px-4 text-sm font-medium">
                          {PERMISSION_LABELS[permKey]}
                        </td>
                        {ROLES.map((role) => {
                          const perm = permissions.find((p) => p.role === role);
                          const value = perm ? perm[permKey] as boolean : false;
                          return (
                            <td key={role} className="text-center py-3 px-4">
                              <Checkbox
                                checked={value}
                                onCheckedChange={() => perm && togglePermission(perm.id, permKey)}
                                disabled={!perm}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Role Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissions.map((perm, i) => (
              <motion.div
                key={perm.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Badge variant={ROLE_COLORS[perm.role]}>
                          {ROLE_LABELS[perm.role] || perm.role}
                        </Badge>
                      </CardTitle>
                      <Button
                        size="sm"
                        onClick={() => handleSave(perm.role)}
                        disabled={saving === perm.role}
                      >
                        {saving === perm.role ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {PERMISSION_KEYS.map((permKey) => (
                        <div key={permKey} className="flex items-center justify-between">
                          <span className="text-sm">{PERMISSION_LABELS[permKey]}</span>
                          <Checkbox
                            checked={perm[permKey] as boolean}
                            onCheckedChange={() => togglePermission(perm.id, permKey)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
