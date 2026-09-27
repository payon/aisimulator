import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { logAction } from '@/lib/audit';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// 매직바이트 최소 검사 (JPEG/PNG/WebP)
function hasValidMagic(buf: Buffer, mime: string): boolean {
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'image/webp') {
    return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

/** POST - 관리자 이미지 업로드 (multipart/form-data, field: file) */
export async function POST(request: NextRequest) {
  try {
    const rl = checkAdminRateLimit(request);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    const session = authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const canManage = await hasPermission(session.role, 'canManageContent');
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file 필드에 이미지 파일을 첨부해주세요.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 });
    }
    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'JPG, PNG, WebP 파일만 업로드할 수 있습니다 (SVG/GIF 차단).' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!hasValidMagic(buf, file.type)) {
      return NextResponse.json({ error: '이미지 파일 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${randomUUID()}${ext}`;
    await writeFile(path.join(dir, name), buf);

    const url = `/uploads/${name}`;
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'create', 'upload', name, { url, size: file.size, mime: file.type }, ip);

    return NextResponse.json({ url, size: file.size, mime: file.type }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** GET - 업로드 안내 (관리용) */
export async function GET(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    maxBytes: MAX_BYTES,
    allowed: Object.keys(ALLOWED_MIME),
    usage: 'POST multipart/form-data file field → { url }',
  });
}
