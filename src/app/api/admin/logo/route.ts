import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasPermission } from '@/lib/admin-auth';
import { checkAdminRateLimit } from '@/lib/rate-limit';
import { logAction } from '@/lib/audit';
import { LOGO_IMAGES, LOGO_DIR, findLogoImage, logoUrlOf } from '@/lib/logo-images';
import { mkdir, stat, writeFile, unlink } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { logger } from '@/lib/logger'

function logoDir(): string {
  return path.join(process.cwd(), 'public', 'uploads', LOGO_DIR);
}

const MAX_BYTES = 10 * 1024 * 1024;

function adminLimited(request: NextRequest) {
  const rl = checkAdminRateLimit(request);
  if (!rl.success) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }
  return null;
}

async function checkManage(request: NextRequest) {
  const session = authenticateRequest(request);
  if (!session) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  const canManage = await hasPermission(session.role, 'canManageConfig');
  if (!canManage) return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
  return { session };
}

/** GET - 화면별 로고 목록 (규격 vs 실제 크기) */
export async function GET(request: NextRequest) {
  try {
    const limited = adminLimited(request);
    if (limited) return limited;
    const auth = await checkManage(request);
    if (auth.error) return auth.error;

    const items = await Promise.all(
      LOGO_IMAGES.map(async (spec) => {
        const abs = path.join(logoDir(), spec.file);
        try {
          const [st, meta] = await Promise.all([stat(abs), sharp(abs).metadata()]);
          return {
            ...spec,
            url: logoUrlOf(spec),
            exists: true,
            actualWidth: meta.width ?? null,
            actualHeight: meta.height ?? null,
            bytes: st.size,
            match: meta.width === spec.width && meta.height === spec.height,
          };
        } catch {
          return {
            ...spec,
            url: logoUrlOf(spec),
            exists: false,
            actualWidth: null,
            actualHeight: null,
            bytes: 0,
            match: false,
          };
        }
      })
    );

    return NextResponse.json({ items });
  } catch (error) {
    logger.error('Logo list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST - 로고 업로드 (multipart: name + file, 화면 규격에 맞게 자동 리사이즈) */
export async function POST(request: NextRequest) {
  try {
    const limited = adminLimited(request);
    if (limited) return limited;
    const auth = await checkManage(request);
    if (auth.error || !auth.session) return auth.error;
    const session = auth.session;

    const form = await request.formData();
    const name = form.get('name');
    const file = form.get('file');

    if (typeof name !== 'string') {
      return NextResponse.json({ error: 'name 필드가 필요합니다.' }, { status: 400 });
    }
    const spec = findLogoImage(name);
    if (!spec) {
      return NextResponse.json({ error: '관리 대상 로고가 아닙니다.' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file 필드에 이미지 파일을 첨부해주세요.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 });
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'PNG, JPG, WebP 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    // 로고는 잘리면 안 되므로 contain + 투명 여백으로 규격에 맞춤
    let out: Buffer;
    try {
      out = await sharp(buf)
        .resize(spec.width, spec.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    } catch {
      return NextResponse.json({ error: '이미지 파일 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    await mkdir(logoDir(), { recursive: true });
    await writeFile(path.join(logoDir(), spec.file), out);

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'update', 'site-logo', spec.file, { file: spec.file, size: out.length }, ip);

    return NextResponse.json({
      success: true,
      file: spec.file,
      url: logoUrlOf(spec),
      width: spec.width,
      height: spec.height,
      bytes: out.length,
    });
  } catch (error) {
    logger.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE - 로고 삭제 (?name=) */
export async function DELETE(request: NextRequest) {
  try {
    const limited = adminLimited(request);
    if (limited) return limited;
    const auth = await checkManage(request);
    if (auth.error || !auth.session) return auth.error;
    const session = auth.session;

    const name = new URL(request.url).searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'name 파라미터가 필요합니다.' }, { status: 400 });
    }
    const spec = findLogoImage(name);
    if (!spec) {
      return NextResponse.json({ error: '관리 대상 로고가 아닙니다.' }, { status: 400 });
    }

    try {
      await unlink(path.join(logoDir(), spec.file));
    } catch {
      return NextResponse.json({ error: '파일이 존재하지 않습니다.' }, { status: 404 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    await logAction(session.userId, session.email, 'delete', 'site-logo', spec.file, { file: spec.file }, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
