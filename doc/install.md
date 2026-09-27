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

> **권장 배포는 Docker Compose 방식이다** (`doc/docker.md` 참조 — PostgreSQL 포함).
> 아래는 CloudPanel 직접(비-Docker) 배포 시 예시이다.

사이트 경로에 `.env` 생성:

```env
# PostgreSQL 접속 정보
DATABASE_URL=postgresql://aiplatform:aiplatform@localhost:5432/aiplatform

# 공개 사이트 URL (메타데이터/OG 이미지 기준 URL)
NEXT_PUBLIC_SITE_URL=https://rustkorea.cloud

# AI 제공자 키 (선택, 없어도 내장 AI로 동작)
OPENAI_API_KEY=
GEMINI_API_KEY=
GROK_API_KEY=
CLAUDE_API_KEY=
DEFAULT_AI_PROVIDER=zai-built-in

# PWA 푸시 알림 (선택 — 관리자 푸시 메뉴에서도 설정 가능)
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=

# API 키·TOTP 시크릿 암호화 키 (프로덕션 필수, 16자 이상 임의 문자열)
API_KEY_SECRET=

# 감사 로그 보존 기간(일, 30 이상, 기본 365)
AUDIT_RETENTION_DAYS=365

# OIDC SSO (선택, 모두 설정 시 관리자 로그인에 SSO 버튼 표시)
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
```

> 개발용 기본 계정(`admin@aiplatform.kr` / `admin123`)으로
> `https://rustkorea.cloud/admin`에 로그인한다. 초기 비밀번호이므로
> 첫 로그인 시 변경 화면이 강제 표시된다.
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
| PostgreSQL 볼륨 (`pgdata`) | 전체 데이터 (콘텐츠·사용자·감사로그) | 자동 (backup 서비스 일간 + 7일 보관) |
| `backups` 볼륨 | `pg_dump` 일간 백업본 | 별도 보관 권장 |
| `uploads` 볼륨 (`public/uploads/`) | 관리자 업로드 이미지 + 서버 TTS 캐시 | 권장 |
| `.env` | 환경 변수 | 권장 (키는 별도 보관) |

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

- 초기 관리자 비밀번호는 첫 로그인 시 변경이 강제된다 (8자 이상, 영문+숫자).
- 내 계정 보안 메뉴에서 2단계 인증(TOTP) 등록 가능. SSO(OIDC)도 환경변수로 연동 가능.
- 로그인 10회/분/IP 초과 시 429, 5회 실패 시 15분 잠금이 적용된다. 신규 IP 로그인은 superadmin에게 알림 생성.
- 세션은 HttpOnly 쿠키(`admin_session`) + Bearer 토큰 병행. XSS로 localStorage 토큰이 탈취돼도 쿠키 세션은 별도 관리.
- 관리자 API는 200회/분/토큰 제한 + RBAC(4역할 × 9권한)이 적용된다.
- AI API 키·TOTP 시크릿·VAPID 비공개키는 AES-256-GCM 암호화 저장 (`API_KEY_SECRET` 필수).
- CSP/X-Frame-Options 등 보안 헤더 적용. 감사 로그는 `AUDIT_RETENTION_DAYS`(기본 365일) 초과분 자동 정리.
