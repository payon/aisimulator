// PWA 아이콘 생성 스크립트 (v2 — 텍스트 없는 순수 벡터 디자인)
// 실행: bun scripts/generate-pwa-icons.ts
// 서버에 폰트가 없어 <text>를 사용하지 않고 도형만으로 그립니다.
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = join(process.cwd(), 'public', 'icons');

const NAVY_1 = '#0f172a';
const NAVY_2 = '#1e3a5f';
const AMBER_1 = '#fbbf24';
const AMBER_2 = '#f97316';
const CREAM = '#fef3c7';
const WHITE = '#f8fafc';
const GLOW_1 = '#3b82f6';
const GLOW_2 = '#8b5cf6';

// 4-point sparkle path (중심 0,0 / 반지름 r)
function sparkle(r: number, inner = 0.16): string {
  const a = r;
  const b = +(r * inner).toFixed(1);
  const c = +(r * 0.62).toFixed(1);
  const d = +(r * 0.1).toFixed(1);
  // 상-우-하-좌 순서의 볼록 곡선 4개 + 대각 작은 빔은 별도 회전으로 처리
  return `M0,${-a} C${b},${-b} ${b},${-b} ${a},0 C${b},${b} ${b},${b} 0,${a} C${-b},${b} ${-b},${b} ${-a},0 C${-b},${-b} ${-b},${-b} 0,${-a}Z`;
}

function defs(idSuffix = ''): string {
  return `<defs>
    <linearGradient id="bg${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${NAVY_1}"/>
      <stop offset="100%" stop-color="${NAVY_2}"/>
    </linearGradient>
    <linearGradient id="sp${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${AMBER_1}"/>
      <stop offset="100%" stop-color="${AMBER_2}"/>
    </linearGradient>
    <linearGradient id="gl${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GLOW_1}"/>
      <stop offset="100%" stop-color="${GLOW_2}"/>
    </linearGradient>
  </defs>`;
}

// 앱 기본 아이콘 (maskable 안전영역: 모티프를 중앙 80% 안에 배치)
function appIcon(size: number): string {
  const c = size / 2;
  const R = size / 2;
  const ring = size * 0.40;
  const sp = size * 0.30;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  ${defs()}
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <circle cx="${c}" cy="${c}" r="${ring}" fill="none" stroke="url(#gl)" stroke-width="${size * 0.008}" opacity="0.45"/>
  <circle cx="${c}" cy="${c}" r="${ring * 0.82}" fill="none" stroke="url(#gl)" stroke-width="${size * 0.005}" opacity="0.25"/>
  <g transform="translate(${c},${c - size * 0.02})">
    <path d="${sparkle(sp)}" fill="url(#sp)"/>
    <path d="${sparkle(sp * 0.55)}" fill="url(#sp)" opacity="0.65" transform="rotate(45)"/>
    <circle cx="0" cy="0" r="${size * 0.035}" fill="${CREAM}"/>
  </g>
  <circle cx="${c - sp * 0.75}" cy="${c + sp * 0.85}" r="${R * 0.045}" fill="${WHITE}" opacity="0.9"/>
  <circle cx="${c}" cy="${c + sp * 0.95}" r="${R * 0.045}" fill="${WHITE}" opacity="0.7"/>
  <circle cx="${c + sp * 0.75}" cy="${c + sp * 0.85}" r="${R * 0.045}" fill="${WHITE}" opacity="0.9"/>
</svg>`;
}

function badgeIcon(): string {
  const s = 72;
  const c = 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  ${defs('b')}
  <rect width="72" height="72" rx="16" fill="url(#bgb)"/>
  <g transform="translate(${c},${c})">
    <path d="${sparkle(22)}" fill="url(#spb)"/>
    <circle cx="0" cy="0" r="4" fill="${CREAM}"/>
  </g>
</svg>`;
}

type ShortcutDef = { id: string; color: string; color2: string; body: string };

const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'chat', color: '#2563eb', color2: '#1d4ed8',
    body: `<rect x="18" y="22" width="60" height="42" rx="14" fill="${WHITE}"/>
      <path d="M32,64 L28,80 L46,64Z" fill="${WHITE}"/>
      <circle cx="36" cy="43" r="5" fill="#2563eb"/>
      <circle cx="48" cy="43" r="5" fill="#2563eb"/>
      <circle cx="60" cy="43" r="5" fill="#2563eb"/>`,
  },
  {
    id: 'image', color: '#7c3aed', color2: '#6d28d9',
    body: `<rect x="18" y="24" width="60" height="48" rx="10" fill="${WHITE}"/>
      <circle cx="34" cy="40" r="7" fill="#7c3aed"/>
      <path d="M22,68 L42,44 L54,58 L62,50 L74,68Z" fill="#7c3aed"/>`,
  },
  {
    id: 'future', color: '#d97706', color2: '#b45309',
    body: `<circle cx="48" cy="42" r="24" fill="${WHITE}"/>
      <g transform="translate(48,42)"><path d="${sparkle(13, 0.2)}" fill="#d97706"/></g>
      <rect x="30" y="70" width="36" height="8" rx="4" fill="${WHITE}"/>`,
  },
  {
    id: 'quiz', color: '#059669', color2: '#047857',
    body: `<circle cx="48" cy="48" r="28" fill="${WHITE}"/>
      <path d="M38,49 L45,56 L60,40" fill="none" stroke="#059669" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
];

function shortcutIcon(s: ShortcutDef): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs><linearGradient id="sc-${s.id}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${s.color}"/><stop offset="100%" stop-color="${s.color2}"/>
  </linearGradient></defs>
  <rect width="96" height="96" rx="22" fill="url(#sc-${s.id})"/>
  ${s.body}
</svg>`;
}

// 설치 스크린샷 (텍스트 없이: 앱 아이콘 모티프 + 기능 도트)
// wide = 데스크톱/키오스크용, narrow = 모바일/태블릿용
function screenshot(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const sp = Math.min(w, h) * 0.24;
  const dots = [-2, -1, 0, 1, 2]
    .map((i) => `<circle cx="${cx + i * sp * 0.75}" cy="${cy + sp * 1.25}" r="${sp * 0.11}" fill="${WHITE}" opacity="${i === 0 ? 1 : 0.45}"/>`)
    .join('\n      ');
  const bars = [-1, 0, 1]
    .map((i) => `<rect x="${cx + i * sp * 0.95 - sp * 0.32}" y="${cy + sp * 1.7}" width="${sp * 0.64}" height="${sp * 0.13}" rx="${sp * 0.065}" fill="${GLOW_1}" opacity="${i === 0 ? 0.9 : 0.5}"/>`)
    .join('\n      ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  ${defs('s')}
  <rect width="${w}" height="${h}" fill="url(#bgs)"/>
  <circle cx="${cx}" cy="${cy - sp * 0.2}" r="${sp * 2.1}" fill="${NAVY_2}" opacity="0.55"/>
  <circle cx="${cx}" cy="${cy - sp * 0.2}" r="${sp * 1.45}" fill="none" stroke="url(#gls)" stroke-width="${sp * 0.035}" opacity="0.4"/>
  <g transform="translate(${cx},${cy - sp * 0.2})">
    <path d="${sparkle(sp)}" fill="url(#sps)"/>
    <circle cx="0" cy="0" r="${sp * 0.12}" fill="${CREAM}"/>
  </g>
  ${dots}
  ${bars}
</svg>`;
}

async function main() {
  if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

  // 앱 아이콘 8종 (모바일 72~태블릿/데스크톱 512, maskable 겸용)
  for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
    await sharp(Buffer.from(appIcon(512)))
      .resize(size, size)
      .png()
      .toFile(join(ICONS_DIR, `icon-${size}x${size}.png`));
    console.log(`  icon-${size}x${size}.png`);
  }

  // 알림 배지 (Android)
  await sharp(Buffer.from(badgeIcon())).resize(72, 72).png()
    .toFile(join(ICONS_DIR, 'badge-72x72.png'));
  console.log('  badge-72x72.png');

  // 바로가기 4종 (Android 롱프레스)
  for (const s of SHORTCUTS) {
    await sharp(Buffer.from(shortcutIcon(s))).resize(96, 96).png()
      .toFile(join(ICONS_DIR, `shortcut-${s.id}.png`));
    console.log(`  shortcut-${s.id}.png`);
  }

  // 스크린샷: wide=데스크톱·키오스크 설치 화면, narrow=모바일·태블릿 설치 화면
  await sharp(Buffer.from(screenshot(1280, 720))).resize(1280, 720).png()
    .toFile(join(ICONS_DIR, 'screenshot-wide.png'));
  console.log('  screenshot-wide.png');
  await sharp(Buffer.from(screenshot(720, 1280))).resize(720, 1280).png()
    .toFile(join(ICONS_DIR, 'screenshot-narrow.png'));
  console.log('  screenshot-narrow.png');

  // Apple 터치 아이콘 (iOS 홈화면) + 파비콘 (데스크톱 브라우저 탭)
  const base = Buffer.from(appIcon(512));
  await sharp(base).resize(180, 180).png().toFile(join(ICONS_DIR, 'apple-touch-icon.png'));
  await sharp(base).resize(32, 32).png().toFile(join(ICONS_DIR, 'favicon-32x32.png'));
  await sharp(base).resize(16, 16).png().toFile(join(ICONS_DIR, 'favicon-16x16.png'));
  console.log('  apple-touch-icon.png, favicon-32x32.png, favicon-16x16.png');

  console.log('PWA icons generated successfully!');
}

main().catch((e) => { console.error(e); process.exit(1); });
