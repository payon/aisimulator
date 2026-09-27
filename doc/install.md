# CloudPanel 설치 가이드

AI 플랫폼(Next.js 16 + Prisma + SQLite)을 CloudPanel 서버에 배포하는 절차.
프로덕션 도메인: `https://rustkorea.cloud` / 앱 포트: `3300`

---

## 1. 사전 요구사항

| 항목 | 값 |
|---|---|
| 서버 OS | Ubuntu 22.04 / 24.04 (CloudPanel 지원 버전) |
| CloudPanel | v2 이상 (Node.js 사이트 지원) |
| Node.js | 20.9+ (Next.js 16 요구사항, CloudPanel에서 버전 선택) |
| 런타임 | Bun 1.3+ **또는** Node 20+ (둘 중 하나, 권장: Bun) |
| DB | SQLite 파일 (별도 DB 서버 불필요) |
| 포트 | `3300` (CloudPanel 리버스 프록시가 외부 80/443 → 3300 연결) |
| DNS | `rustkorea.cloud` A 레코드 → 서버 IP (`72.62.251.229`) |

---

## 2. CloudPanel 사이트 생성

1. CloudPanel 관리 패널 → **Sites → Add Site → Node.js** 선택
2. 입력값:
   - Domain: `rustkorea.cloud`
   - Node.js Version: `20` 이상 (선택 가능한 최신 LTS)
   - App Port: `3300`
   - Document Root: CloudPanel이 생성하는 사이트 경로 (예: `/home/<site-user>/htdocs/rustkorea.cloud`)
3. 사이트 생성 후 **SSL → Let's Encrypt** 발급 (CloudPanel이 Nginx + 인증서 자동 구성)

> CloudPanel이 Nginx 리버스 프록시(`80/443 → 127.0.0.1:3300`)를 자동 생성하므로,
> 저장소의 `Caddyfile`은 CloudPanel 환경에서는 사용하지 않는다.
> (`Caddyfile`은 Caddy 직접 운영 시에만 사용)

---

## 3. 코드 배치 (SSH)

사이트 사용자로 SSH 접속 후 사이트 경로에서 실행:

```bash
cd ~/htdocs/rustkorea.cloud

# 신규 배치
git clone <repository-url> .
# 또는 기존 배치 갱신
git pull
```

---

## 4. 환경 변수 (`.env`)

사이트 경로에 `.env` 생성:

```env
# SQLite 파일 경로 (사이트 경로 기준 상대경로 권장)
DATABASE_URL=file:./db/custom.db

# 공개 사이트 URL (메타데이터/OG 이미지 기준 URL)
NEXT_PUBLIC_SITE_URL=https://rustkorea.cloud

# AI 제공자 키 (선택, 없어도 내장 AI로 동작)
OPENAI_API_KEY=
GEMINI_API_KEY=
GROK_API_KEY=
CLAUDE_API_KEY=
DEFAULT_AI_PROVIDER=zai-built-in

# PWA 푸시 알림 (선택)
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
```

> 개발용 기본 계정(`admin@aiplatform.kr` / `admin123`)으로
> `https://rustkorea.cloud/admin`에 로그인 후
> 사용자 관리에서 반드시 비밀번호를 변경한다.
> (관리자 진입점은 프론트에 노출되지 않으며, `/admin` 직접 접속만 허용된다.)

---

## 5. 설치 · DB · 빌드

```bash
# 1. 의존성 설치 (Bun 권장, npm도 가능)
bun install
# npm 사용 시: npm install

# 2. Prisma 클라이언트 생성 + 스키마 반영
bun run db:generate
bun run db:push

# 3. 초기 데이터 (관리자 계정/권한/기본 콘텐츠/사이트 설정)
bun prisma/seed.ts

# 4. 프로덕션 빌드
bun run build
```

`build` 스크립트는 standalone 번들(`.next/standalone`) + `public` 복사를 자동 수행한다.

---

## 6. 프로덕션 실행

### 6.1 직접 실행 (동작 확인용)

```bash
# package.json start 스크립트와 동일
NODE_ENV=production bun .next/standalone/server.js
# → http://127.0.0.1:3300 리스닝 확인
```

### 6.2 상시 실행 (PM2 권장)

```bash
bun add -g pm2   # 또는 npm i -g pm2

pm2 start .next/standalone/server.js \
  --name aiplatform \
  --interpreter ~/.bun/bin/bun \
  --cwd ~/htdocs/rustkorea.cloud \
  --update-env

pm2 save
pm2 startup   # 출력되는 명령을 root로 1회 실행 (부팅 자동시작)
```

Node만 사용하는 경우:

```bash
pm2 start .next/standalone/server.js --name aiplatform
```

### 6.3 CloudPanel에서 재시작

CloudPanel Node.js 사이트 화면의 **Restart / Stop / Start** 버튼으로 앱을 제어한다.
(CloudPanel이 PM2 프로세스를 대신 관리하는 구성인 경우 PM2 직접 조작 불필요 —
사이트 화면의 프로세스 상태를 기준으로 한다.)

---

## 7. 배포 후 확인 체크리스트

| 확인 | 방법 | 기대값 |
|---|---|---|
| 사이트 접속 | `https://rustkorea.cloud/` | 200, 홈 화면 렌더링 |
| 공개 설정 API | `https://rustkorea.cloud/api/config` | `{"success":true,"data":{...}}` |
| CMS 공개 API | `https://rustkorea.cloud/api/cms/content` | 200 |
| PWA 매니페스트 | `https://rustkorea.cloud/manifest.json` | 200 |
| TWA 검증 파일 | `https://rustkorea.cloud/.well-known/assetlinks.json` | 200 (서명 지문은 Play Console 키로 교체 필요) |
| 관리자 로그인 | `https://rustkorea.cloud/admin` → `admin@aiplatform.kr` | 대시보드 표시 |
| 감사 로그 | 관리자 → 감사 로그 | 로그인 기록 존재 |

---

## 8. 업데이트 절차

```bash
cd ~/htdocs/rustkorea.cloud
git pull
bun install
bun run db:generate
bun run db:push
bun run build
pm2 restart aiplatform   # 또는 CloudPanel 사이트 화면에서 Restart
```

> `prisma/schema.prisma` 변경이 있으면 반드시 `db:push`를 실행한다.
> SQLite 파일(`db/custom.db`)은 코드와 분리 보관하고, 업데이트 전 백업한다:
> `cp db/custom.db db/custom.db.bak-$(date +%F)`

---

## 9. 디렉터리 · 데이터 안내

| 경로 | 용도 | 백업 |
|---|---|---|
| `db/custom.db` | SQLite 전체 데이터 (콘텐츠·사용자·감사로그) | 필수 |
| `public/uploads/` | 관리자 업로드 이미지 (`/uploads/*` URL 서빙) | 권장 |
| `.env` | 환경 변수 | 권장 (키는 별도 보관) |
| `.next/` | 빌드 산출물 (재생성 가능) | 불필요 |

---

## 10. 트러블슈팅

| 증상 | 원인 / 조치 |
|---|---|
| `502 Bad Gateway` | 앱 미기동. `pm2 status` / `pm2 logs aiplatform` 확인 후 재시작. 포트가 `3300`인지 확인 |
| `EADDRINUSE :::3300` | 중복 실행. `pm2 delete aiplatform` 후 1개만 기동 |
| 로그인 `401` 반복 | 서버 재시작 시 인메모리 세션 초기화 → 재로그인. 5회 실패 시 15분 잠금 capability |
| CMS 변경이 키오스크에 늦게 반영 | 정상 동작 (최대 ~15초 폴링 수렴). 즉시 반영 필요 시 해당 단말 새로고침 |
| TTS 음성 없음 | 서버 문제가 아님. 재생 기기의 브라우저 음성 엔진 문제 → 접근성 패널(♿)의 TTS 상태 확인 |
| `PrismaClient` 관련 에러 | `bun run db:generate` 미실행 → 5절 순서대로 재실행 |
| OG 이미지가 localhost로 나옴 | `NEXT_PUBLIC_SITE_URL` 미설정 후 빌드 → `.env` 수정 후 `build`부터 다시 실행 |

---

## 11. 보안 메모

- 초기 관리자 비밀번호(`admin123`)는 설치 직후 변경한다.
- 로그인 10회/분/IP 초과 시 429, 5회 실패 시 15분 잠금이 적용된다.
- 관리자 API는 200회/분/토큰 제한 + RBAC(4역할 × 9권한)이 적용된다.
- CMS 입력값은 키 형식·타입별 스킴·XSS 패턴이 서버에서 검증된다.
- 이미지 업로드는 JPG/PNG/WebP + 매직바이트 검사, SVG/GIF는 차단된다.
- 향후 강화 예정: API 키 암호화 저장, HttpOnly 쿠키 전환, Redis 세션 (로드맵 v2.2~v3.0)
