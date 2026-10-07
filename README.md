# aisimulator
AI 시뮬레이터

## 실서버 구축 (Docker만 사용, 포트 3300)

요구사항: Docker + Docker Compose

```bash
git clone <repo-url> aiplatform
cd aiplatform
docker compose up -d --build
```

- 앱: `http://서버IP:3300`
- 관리자: `http://서버IP:3300/admin`
  - 초기 아이디 `admin@aiplatform.kr` / 초기 비밀번호 `admin123`
  - 첫 로그인 시 비밀번호 변경 필수
- DB(PostgreSQL)·업로드는 Docker 볼륨에 보관되어 재배포해도 유지됩니다.
- 컨테이너 시작 시 스키마 반영 → 최초 1회 시드 → 서버 기동까지 자동 수행됩니다.

### 환경변수 (.env, 모두 선택 — 없으면 기본값 동작)

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `APP_PORT` | `3300` | 호스트 포트 |
| `PG_PORT` | `5433` | 호스트 PostgreSQL 포트 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `aiplatform` | DB 접속 정보 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@aiplatform.kr` / `admin123` | 최초 시드 관리자 (기존 계정이 있으면 무시) |
| `API_KEY_SECRET` | (없음) | TOTP·API키 암호화 키, 운영 필수 |
| `NEXT_PUBLIC_SITE_URL` | `https://rustkorea.cloud` | 공개 URL |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `GROK_API_KEY` / `CLAUDE_API_KEY` | (없음) | 실제 AI 사용 시 (관리자 설정에서도 입력 가능) |
| `AUDIT_RETENTION_DAYS` | `365` | 감사 로그 보존일 |

### 운영 명령

```bash
docker compose ps            # 상태 확인
docker compose logs -f app   # 앱 로그
docker compose up -d --build app  # 재배포 (DB·업로드 유지)
```
