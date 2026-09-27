'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  FileText,
  Code,
  Type,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { refreshCmsContent } from '@/hooks/use-cms-content';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  key: string;
  category: string;
  type: string;
  value: string;
  label: string | null;
  description: string | null;
  sortOrder: number;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'all', label: '전체' },
  { value: 'home', label: '홈' },
  { value: 'chat', label: '대화' },
  { value: 'image', label: '이미지' },
  { value: 'future', label: '미래의 나' },
  { value: 'quiz', label: '퀴즈' },
  { value: 'settings', label: '설정' },
  { value: 'global', label: '전역' },
  { value: 'nav', label: '네비게이션' },
];

const CONTENT_TYPES = [
  { value: 'text', label: '텍스트' },
  { value: 'rich_text', label: '리치 텍스트' },
  { value: 'image', label: '이미지' },
  { value: 'json', label: 'JSON' },
  { value: 'color', label: '색상' },
  { value: 'url', label: 'URL' },
];

const CATEGORY_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  home: 'default',
  chat: 'secondary',
  image: 'outline',
  future: 'default',
  quiz: 'secondary',
  settings: 'outline',
  global: 'default',
  nav: 'secondary',
};

const CATEGORY_LABELS: Record<string, string> = {
  home: '홈',
  chat: '대화',
  image: '이미지',
  future: '미래의 나',
  quiz: '퀴즈',
  settings: '설정',
  global: '전역',
  nav: '네비게이션',
};

export default function ContentManager() {
  const { authenticatedFetch } = useAdminAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formKey, setFormKey] = useState('');
  const [formCategory, setFormCategory] = useState('home');
  const [formType, setFormType] = useState('text');
  const [formValue, setFormValue] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageFileUpload = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('JPG, PNG, WebP 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await authenticatedFetch('/api/admin/uploads', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setFormValue(data.url);
        toast.success('이미지가 업로드되었습니다.');
      } else if (res.status !== 401) {
        toast.error(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/content');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else if (res.status !== 401) {
        // 401은 authenticatedFetch에서 자동 로그아웃 처리
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || '콘텐츠를 불러오지 못했습니다.');
      }
    } catch {
      toast.error('콘텐츠를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSearch =
        !searchQuery ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  const openEdit = (item: ContentItem) => {
    setEditItem(item);
    setIsCreating(false);
    setFormKey(item.key);
    setFormCategory(item.category);
    setFormType(item.type);
    setFormValue(item.value);
    setFormLabel(item.label || '');
    setFormDescription(item.description || '');
    setJsonError('');
    setEditOpen(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setIsCreating(true);
    setFormKey('');
    setFormCategory(categoryFilter !== 'all' ? categoryFilter : 'home');
    setFormType('text');
    setFormValue('');
    setFormLabel('');
    setFormDescription('');
    setJsonError('');
    setEditOpen(true);
  };

  const validateJson = (value: string) => {
    if (formType !== 'json' || !value.trim()) {
      setJsonError('');
      return true;
    }
    try {
      JSON.parse(value);
      setJsonError('');
      return true;
    } catch {
      setJsonError('올바른 JSON 형식이 아닙니다.');
      return false;
    }
  };

  const handleSave = async () => {
    if (!formKey.trim()) {
      toast.error('키를 입력해주세요.');
      return;
    }
    if (!validateJson(formValue)) return;

    setSaving(true);
    try {
      const body = {
        key: formKey,
        category: formCategory,
        type: formType,
        value: formValue,
        label: formLabel || null,
        description: formDescription || null,
      };

      let res;
      if (isCreating) {
        res = await authenticatedFetch('/api/admin/content', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } else if (editItem) {
        res = await authenticatedFetch('/api/admin/content', {
          method: 'PUT',
          body: JSON.stringify({ id: editItem.id, ...body }),
        });
      }

      if (res && res.ok) {
        toast.success(isCreating ? '콘텐츠가 생성되었습니다.' : '콘텐츠가 수정되었습니다.');
        setEditOpen(false);
        fetchItems();
        // 프론트엔드에 즉시 반영
        refreshCmsContent();
      } else if (res && res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authenticatedFetch(`/api/admin/content?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('콘텐츠가 삭제되었습니다.');
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchItems();
        // 프론트엔드에 즉시 반영
        refreshCmsContent();
      } else if (res.status !== 401) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-3 h-3" />;
      case 'json': return <Code className="w-3 h-3" />;
      case 'rich_text': return <FileText className="w-3 h-3" />;
      default: return <Type className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">콘텐츠 관리</h2>
          <p className="text-muted-foreground">CMS 콘텐츠 항목 관리</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          새 콘텐츠
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="키 또는 라벨로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="sm:w-auto" orientation="horizontal">
          <div className="flex gap-1 pb-1">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={categoryFilter === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat.value)}
                className="whitespace-nowrap"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            콘텐츠 항목이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filteredItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <code className="text-sm font-mono font-medium">{item.key}</code>
                          <Badge variant={CATEGORY_COLORS[item.category] || 'outline'} className="text-xs">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            {getTypeIcon(item.type)}
                            {item.type}
                          </Badge>
                        </div>
                        {item.label && (
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {item.type === 'json' ? 'JSON 데이터' : item.value.slice(0, 100)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteTarget(item);
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? '새 콘텐츠 생성' : '콘텐츠 수정'}</DialogTitle>
            <DialogDescription>
              {isCreating ? '새로운 콘텐츠 항목을 생성합니다.' : '콘텐츠 항목을 수정합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>키 *</Label>
              <Input
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="예: home.hero.title"
                disabled={!isCreating}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>타입</Label>
                <Select value={formType} onValueChange={(v) => { setFormType(v); setJsonError(''); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>값</Label>
              {formType === 'image' ? (
                <div className="space-y-2">
                  <Input
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="이미지 URL (/uploads/... 또는 https://...)"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFileUpload(f);
                        e.target.value = '';
                      }}
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  </div>
                  {formValue && (
                    <div className="rounded-lg border overflow-hidden">
                      <ResponsiveImage
                        src={formValue}
                        alt="미리보기"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              ) : formType === 'text' || formType === 'rich_text' ? (
                <Textarea
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  rows={4}
                  placeholder="텍스트 내용"
                />
              ) : formType === 'json' ? (
                <div className="space-y-1">
                  <Textarea
                    value={formValue}
                    onChange={(e) => {
                      setFormValue(e.target.value);
                      validateJson(e.target.value);
                    }}
                    rows={6}
                    placeholder='{"key": "value"}'
                    className={jsonError ? 'border-destructive' : ''}
                  />
                  {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                </div>
              ) : (
                <Input
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="값"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>라벨</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="관리자 UI에 표시할 라벨"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="관리자를 위한 설명"
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
            <AlertDialogTitle>콘텐츠 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.key}&quot; 콘텐츠를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
