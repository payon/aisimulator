'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  UserPlus,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = [
  { value: 'superadmin', label: '슈퍼관리자' },
  { value: 'admin', label: '관리자' },
  { value: 'editor', label: '편집자' },
  { value: 'viewer', label: '조회자' },
];

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  superadmin: 'destructive',
  admin: 'default',
  editor: 'secondary',
  viewer: 'outline',
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: '슈퍼관리자',
  admin: '관리자',
  editor: '편집자',
  viewer: '조회자',
};

export default function UserManager() {
  const { authenticatedFetch } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('editor');
  const [formPassword, setFormPassword] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else if (res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || '사용자 목록을 불러오지 못했습니다.');
      }
    } catch {
      toast.error('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setIsCreating(false);
    setFormEmail(user.email);
    setFormName(user.name);
    setFormRole(user.role);
    setFormPassword('');
    setEditOpen(true);
  };

  const openCreate = () => {
    setEditUser(null);
    setIsCreating(true);
    setFormEmail('');
    setFormName('');
    setFormRole('editor');
    setFormPassword('');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formEmail.trim() || !formName.trim()) {
      toast.error('이메일과 이름을 입력해주세요.');
      return;
    }
    if (isCreating && !formPassword.trim()) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = {
        email: formEmail,
        name: formName,
        role: formRole,
      };
      if (formPassword) body.password = formPassword;

      let res;
      if (isCreating) {
        res = await authenticatedFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } else if (editUser) {
        res = await authenticatedFetch('/api/admin/users', {
          method: 'PUT',
          body: JSON.stringify({ id: editUser.id, ...body }),
        });
      }

      if (res && res.ok) {
        toast.success(isCreating ? '사용자가 생성되었습니다.' : '사용자가 수정되었습니다.');
        setEditOpen(false);
        fetchUsers();
      } else if (res && res.status !== 401) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const res = await authenticatedFetch(`/api/admin/users?id=${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(user.isActive ? '비활성화되었습니다.' : '활성화되었습니다.');
        fetchUsers();
      }
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authenticatedFetch(`/api/admin/users?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('사용자가 삭제되었습니다.');
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchUsers();
      } else if (res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">사용자 관리</h2>
          <p className="text-muted-foreground">관리자 사용자 계정 관리</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <UserPlus className="w-4 h-4 mr-2" />
          새 사용자
        </Button>
      </div>

      {/* User List */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            사용자가 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {users.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`hover:shadow-md transition-shadow ${!user.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{user.name}</span>
                            <Badge variant={ROLE_COLORS[user.role] || 'outline'}>
                              {ROLE_LABELS[user.role] || user.role}
                            </Badge>
                            {!user.isActive && (
                              <Badge variant="outline" className="text-muted-foreground">비활성</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            마지막 로그인: {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR')
                              : '없음'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`active-${user.id}`} className="text-xs hidden sm:inline">
                            활성
                          </Label>
                          <Switch
                            id={`active-${user.id}`}
                            checked={user.isActive}
                            onCheckedChange={() => handleToggleActive(user)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteTarget(user);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreating ? '새 사용자 생성' : '사용자 수정'}</DialogTitle>
            <DialogDescription>
              {isCreating ? '새로운 관리자 계정을 생성합니다.' : '관리자 계정 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이메일 *</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="관리자 이름"
              />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isCreating ? '비밀번호 *' : '비밀번호 (변경 시에만 입력)'}</Label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={isCreating ? '비밀번호 입력' : '새 비밀번호'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isCreating ? '생성' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; ({deleteTarget?.email}) 사용자를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
