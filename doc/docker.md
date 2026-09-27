# Docker Compose 운영 가이드 (PostgreSQL)

`docker-compose.yml` + `Dockerfile` 기반 프로덕션 구성.
앱(`3300`) + PostgreSQL 16. DB는 SQLite에서 PostgreSQL로 전환되었다.

---

## 1. 구성

| 서비스 | 이미지/기반 | 포트 | 볼륨 |
|---|---|---|---|
| `db` | `postgres:16-alpine` | 내부 5432 | `pgdata` (DB 영속) |
| `app` | Next.js standalone (multi-stage 빌드) | `3300:3300` | `uploads` (`public/uploads` 영속) |

- 스키마: 기동 시 `prisma db push` 자동 반영 (`docker/entrypoint.sh`)
- 시드: 관리자 계정이 없으면 최초 1회만 생성 (`docker/seed.js`,
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` 환경변수, 기본 `admin@aiplatform.kr`/`admin123`)
- CMS 기본 콘텐츠는 프론트 fallback으로 동작하므로 시드에 포함하지 않는다

## 2. 기본 명령

```bash
# 빌드 + 기동
docker compose up -d --build

# 상태/로그
docker compose ps
docker compose logs -f app
docker compose logs -f db

# 중지/재기동
docker compose stop
docker compose start
docker compose restart app

# 완전 정리 (DB 볼륨까지 삭제 — 데이터 소실 주의)
docker compose down -v
```

## 3. 환경 변수

`docker-compose.yml`의 `environment` 또는同 디렉토리 `.env` 파일로 주입:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `aiplatform` | DB 접속 정보 |
| `APP_PORT` | `3300` | 호스트 노출 포트 |
| `NEXT_PUBLIC_SITE_URL` | `https://rustkorea.cloud` | 메타데이터 기준 URL (빌드 시점에 고정되므로 변경 후 rebuild 필요) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@aiplatform.kr` / `admin123` | 최초 시드 계정 (첫 기동 후 로그인하여 변경) |
| `OPENAI_API_KEY` 등 | — | AI 제공자 키 (선택) |

## 4. 업데이트

```bash
git pull
docker compose up -d --build
```

DB 마이그레이션(`prisma db push`)은 기동 시 자동 실행된다.
PostgreSQL 백업:

```bash
docker compose exec db pg_dump -U aiplatform aiplatform > backup-$(date +%F).sql
```

## 5. 로컬 개발

```bash
# DB만 compose로 띄우고 Next는 로컬 dev 서버로
docker compose up -d db
# .env: DATABASE_URL=postgresql://aiplatform:aiplatform@localhost:5433/aiplatform
bun run dev
```

## 6. 트러블슈팅

| 증상 | 조치 |
|---|---|
| `app`이 `db` 대기 중 반복 | `docker compose logs db` — 최초 기동 시 초기화 시간 소요. `pgdata` 권한 문제 시 `docker compose down -v` 후 재기동 (데이터 소실 주의) |
| `EADDRINUSE 3300` | 로컬 dev 서버 중복 → `pkill -f "next dev"` 후 compose 기동, 또는 `APP_PORT=3301 docker compose up -d` |
| 빌드 시 sharp/prisma 에러 | `node:20-bookworm-slim` 기준 prebuilt 사용. 아키텍처가 ARM이 아닌지 확인 (`docker compose build --no-cache`) |
| 로그인 401 반복 | 컨테이너 재시작 시 인메모리 세션 초기화 → 재로그인 |

## 7. E2E 테스트 (Playwright)

```bash
bunx playwright install chromium   # 최초 1회 (CI는 --with-deps 필요)
```

테스트는 2FA 없는 관리자 계정이 필요하다. superadmin으로 생성 후 환경변수로 지정:

```bash
# E2E 전용 계정 생성 (예시, 테스트 후 삭제 권장)
# 관리자 → 사용자 관리 → e2e@aiplatform.kr / admin 역할
E2E_BASE_URL=http://localhost:3300 \
E2E_ADMIN_EMAIL=e2e@aiplatform.kr \
E2E_ADMIN_PASSWORD='<password>' \
bunx playwright test
```

포함된 시나리오: 관리자 로그인(성공/실패/화면), CMS CRUD + XSS 가드 + 버전 롤백,
목업 프리셋 반영, 헬스체크 (`tests/e2e/`).
