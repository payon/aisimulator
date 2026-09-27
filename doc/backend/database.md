# 데이터베이스 설계 및 마이그레이션 전략 (Database)

## 1. 개요

본 문서는 AI 플랫폼의 데이터베이스 설계, ER 다이어그램, 13개 모델 상세 명세,
인덱싱 전략, SQLite 제약 및 해결책, PostgreSQL/MySQL 마이그레이션 체크리스트,
데이터 시드 전략, 백업 절차를 정의합니다. 현재 Prisma ORM + SQLite를 사용하며,
프로덕션 환경에서는 PostgreSQL 또는 MySQL로 마이그레이션할 수 있도록 설계되었습니다.

---

## 2. ER 다이어그램 (Text)

```
┌─────────────┐      ┌──────────────┐
│  AdminUser  │1   ∞ │  AuditLog    │
│─────────────│──────│──────────────│
│ id (PK)     │      │ id (PK)      │
│ email (UQ)  │      │ userId (FK)  │
│ name        │      │ action       │
│ passwordHash│      │ entity       │
│ role        │      │ entityId     │
│ isActive    │      │ changes      │
└─────────────┘      └──────────────┘

┌─────────────┐      ┌──────────────────┐
│  Content    │1   ∞ │  ContentVersion  │
│─────────────│──────│──────────────────│
│ id (PK)     │      │ id (PK)          │
│ key (UQ)    │      │ contentId (FK)   │
│ category    │      │ key              │
│ type        │      │ oldValue         │
│ value       │      │ newValue         │
│ label       │      │ updatedBy        │
└─────────────┘      └──────────────────┘

┌─────────────┐      ┌──────────────┐
│ ChatSession │1   ∞ │ ChatMessage  │
│─────────────│──────│──────────────│
│ id (PK)     │      │ id (PK)      │
│ title       │      │ sessionId(FK)│
│ provider    │      │ role         │
└─────────────┘      │ content      │
                      └──────────────┘

┌───────────┐  ┌─────────────┐  ┌──────────────┐
│ SiteConfig│  │ QuizResult  │  │ ImageHistory │
│───────────│  │─────────────│  │──────────────│
│ id (PK)   │  │ id (PK)     │  │ id (PK)      │
│ siteName  │  │ difficulty  │  │ style        │
│ language  │  │ score       │  │ imageUrl     │
│ layout    │  │ total       │  └──────────────┘
└───────────┘  └─────────────┘

┌───────────────┐  ┌───────────────────┐  ┌──────────────────┐
│ Notification  │  │ UserActivity      │  │OnboardingProgress│
│───────────────│  │───────────────────│  │──────────────────│
│ id (PK)       │  │ id (PK)           │  │ id (PK)          │
│ type          │  │ action            │  │ sessionId (UQ)   │
│ priority      │  │ entity            │  │ step             │
│ title         │  │ metadata          │  │ completed        │
│ message       │  │ sessionId         │  │ skipped          │
│ targetRole    │  └───────────────────┘  └──────────────────┘
│ isRead        │
└───────────────┘

┌───────────────────┐
│  Permission       │
│───────────────────│
│ id (PK)           │
│ role (UQ)         │
│ canManageUsers    │
│ canManageContent  │
│ canManageConfig   │
│ canViewAudit      │
│ canDeleteContent  │
│ canManageAPIKeys  │
│ canManageNotif.   │
│ canExportData     │
│ canViewAnalytics  │
└───────────────────┘
```

---

## 3. 13개 모델 상세 (Field Descriptions)

### 3.1 AiSettings — AI 공급자 설정

| 필드        | 타입      | 설명                                    |
|-------------|-----------|-----------------------------------------|
| id          | String PK | 단일 행 (고정값 "default")              |
| provider    | String    | 활성 AI Provider (zai-built-in 등)      |
| openaiKey   | String?   | OpenAI API Key (암호화 저장)            |
| geminiKey   | String?   | Google Gemini API Key                   |
| grokKey     | String?   | xAI Grok API Key                       |
| claudeKey   | String?   | Anthropic Claude API Key               |
| updatedAt   | DateTime  | 마지막 수정 시각                        |
| createdAt   | DateTime  | 생성 시각                              |

### 3.2 ChatSession — 채팅 세션

| 필드        | 타입      | 설명                                    |
|-------------|-----------|-----------------------------------------|
| id          | String PK | CUID 자동 생성                         |
| title       | String?   | 세션 제목 (자동 또는 수동 지정)        |
| provider    | String    | 사용한 AI Provider                      |
| createdAt   | DateTime  | 세션 생성 시각                         |
| updatedAt   | DateTime  | 마지막 수정 시각                       |

### 3.3 ChatMessage — 채팅 메시지

| 필드        | 타입       | 설명                                  |
|-------------|------------|---------------------------------------|
| id          | String PK  | CUID 자동 생성                       |
| sessionId   | String FK  | 소속 세션 참조 (Cascade 삭제)        |
| role        | String     | 메시지 역할 (user/assistant/system)  |
| content     | String     | 메시지 본문                          |
| createdAt   | DateTime   | 전송 시각                            |

### 3.4 QuizResult — 퀴즈 결과

| 필드        | 타입       | 설명                                  |
|-------------|------------|---------------------------------------|
| id          | String PK  | CUID 자동 생성                       |
| difficulty  | String     | 난이도 (easy/medium/hard)            |
| score       | Int        | 득점                                 |
| total       | Int        | 총 문항 수                           |
| createdAt   | DateTime   | 완료 시각                            |

### 3.5 ImageHistory — 이미지 변환 이력

| 필드        | 타입       | 설명                                  |
|-------------|------------|---------------------------------------|
| id          | String PK  | CUID 자동 생성                       |
| style       | String?    | 적용 스타일 (watercolor, oil, ...)   |
| imageUrl    | String?    | 결과 이미지 URL                      |
| createdAt   | DateTime   | 변환 일시                            |

### 3.6 AdminUser — 관리자 사용자

| 필드         | 타입       | 설명                                   |
|--------------|------------|----------------------------------------|
| id           | String PK  | CUID 자동 생성                        |
| email        | String UQ  | 로그인 이메일 (유일)                  |
| name         | String     | 표시 이름                             |
| passwordHash | String     | bcrypt 해시 (평문 저장 금지)          |
| role         | String     | 역할 (superadmin, admin, editor, viewer)|
| isActive     | Boolean    | 계정 활성 여부                        |
| lastLoginAt  | DateTime?  | 마지막 로그인 시각                    |
| createdAt    | DateTime   | 계정 생성 시각                        |
| updatedAt    | DateTime   | 마지막 수정 시각                     |

### 3.7 Content — CMS 콘텐츠

| 필드        | 타입       | 설명                                   |
|-------------|------------|----------------------------------------|
| id          | String PK  | CUID 자동 생성                        |
| key         | String UQ  | 콘텐츠 식별자 (예: home.hero.title)  |
| category    | String     | 분류 (home, chat, image, ...)          |
| type        | String     | 값 유형 (text, image, json, ...)       |
| value       | String     | 콘텐츠 값                             |
| label       | String?    | 관리자 UI 표시 라벨                   |
| description | String?    | 관리자용 설명                         |
| sortOrder   | Int        | 정렬 순서                             |
| updatedAt   | DateTime   | 마지막 수정 시각                     |
| updatedBy   | String?    | 마지막 수정자 ID                      |
| createdAt   | DateTime   | 생성 시각                             |

### 3.8 SiteConfig — 사이트 전역 설정

| 필드              | 타입      | 설명                                     |
|-------------------|-----------|------------------------------------------|
| id                | String PK | 단일 행 (고정값 "default")               |
| siteName          | String    | 사이트명                                 |
| siteDescription   | String    | 사이트 설명                              |
| logoUrl           | String?   | 로고 이미지 URL                          |
| faviconUrl        | String?   | 파비콘 URL                              |
| primaryColor      | String    | 메인 색상 (HEX, 예: #1a1a2e)             |
| layoutMode        | String    | 레이아웃 모드 (auto, kiosk, desktop...)  |
| language          | String    | 기본 언어 (ko, en)                       |
| maintenanceMode   | Boolean   | 유지보수 모드 활성화                     |
| updatedAt         | DateTime  | 마지막 수정 시각                         |
| createdAt        -| DateTime  | 생성 시각                                |

### 3.9 AuditLog — 감사 로그

| 필드        | 타입       | 설명                                   |
|-------------|------------|----------------------------------------|
| id          | String PK  | CUID 자동 생성                        |
| userId      | String?    | 수정자 ID (삭제 시 NULL 가능)         |
| userEmail   | StringA?    | 수정자 이메일 (빠른 조회용)           |
| action      | String     | 액션 (create, update, delete, login)   |
| entity      | String     | 대상 엔티티 (content, user, config)    |
| entityId    | String?    | 대상 엔티티 ID                         |
| changes     | String?    | 변경 내용 (JSON 문자열)               |
| ip          | String?    | 클라이언트 IP                          |
| createdAt   | DateTime   | 발생 일시                              |

### 3.10 Notification — 인앱 알림

| 필드        | 타입       | 설명                                   |
|-------------|------------|----------------------------------------|
| id          | String PK  | CUID 자동 생성                        |
| type        | String     | 유형 (info, success, error, warning)  |
| priority    | String     | 우선순위 (low, normal, high, urgent)  |
| title       | String     | 알림 제목                             |
| message     | String     | 알림 본문                             |
| isRead      | Boolean    | 읽음 여부                             |
| actionUrl   | String?    | 관련 액션 URL                         |
| targetRole  | String?    | 대상 역할 (null = 모든 역할)          |
| createdAt   | DateTime   | 생성 시각                             |
| updatedAt   | DateTime   | 마지막 수정 시각                     |

### 3.11 UserActivity — 사용자 활동 추적

| 필드        | 타입       | 설명                                   |
|-------------|------------|----------------------------------------|
| id          | String PK  | CUID 자동 생성                        |
| userId      | String?    | 사용자 ID (비로그인 시 NULL)          |
| action      | String     | 액션 (page_view, chat_message 등)     |
| entity      | String     | 대상 엔티티 (chat, quiz, image 등)    |
| metadata    | String?6?    | 추가 정보 (JSON 문자열)              |
| sessionId   | String?    | 브라우저 세션 ID                      |
| createdAt   | DateTime   | 발생 일시                              |

### 3.12 ContentVersion — 콘텐츠 버전 이력

| 필드        | 타입       | 설명                                   |
|-------------|------------|----------------------------------------|
| id          | String PK  | CUID 자동 생성                        |
| contentId   | String FK  | 소속 콘텐츠 참조 (Cascade 삭제)      |
| key         | String     | 콘텐츠 �!key (스냅E샷)                 |
| oldValue    | String?    | 이전 값 (첫 생성 시 null)             |
| newValue    | String     | 새 값                                 |
| updatedBy   | String?    | 수정자 ID                             |
| createdAt   | DateTime   | 버전 생성 일시                        |

### 3.13 OnboardingProgress — 온보딩 진행 상태

| 필드        | 타입       | 설명                                   |
|-------------|------------|----------------------------------------|
| id          | String PK  | CUID 자동 생성                        |
| sessionId   | String UQ  | 브라우저 세션 ID (유일)               |
| step        | Int        | 현재 단계 번호                        |
| completed   |%Boolean    | 완료 여부                             |
| skipped     | Boolean    | 건너뜀 여부                           |
| createdAt   | DateTime   | 생성 시각                             |
| updatedAt   | DateTime   | 마지막 수정 시각                     |

### 3.14 Permission — 권한 정의

| 필드                     | 타입      | 설명                              |
|--------------------------|-----------|-----------------------------------|
| id                       | String PK | CUID 자동 생성                   |
| role                     | String UQ | 역할 이름 (유일)                 |
| canManageUsers           | Boolean   | 사용자 관리 권한                 |
| canManageContent         | Boolean   | 콘텐츠 관리 권한                 |
| canManageConfig          | Boolean   | 설정 관리 권한                   |
| canViewAudit             | Boolean   | 감사 로그 조회 권한              |
| canDeleteContent         | Boolean   | 콘텐츠 삭제 권한                 |
| can6ManageAPIKeys        | Boolean   | API Key 관리 권한                |
| canManageNotifications   | Boolean   | 알림 관리 권한                   |
| canExportData            | Boolean   | 데이터 내보내기 권한             |
| canViewAnalytics         | Boolean   | 분석 데이터 조회 권한            |
| createdAt                | DateTime  | 생성 시각                         |
| updatedAt                | DateTime  | 마지막 수정 시각                 |

---

## 4. 인덱싱 전략 (Indexing Strategy)

### 4.1 Prisma 스키마 인덱스

| 모델          | 인덱스 필드             | 유형      | 목적                        |
|---------------|------------------------|-----------|----------------'-------------|
| AdminUser     | email                  | UNIQUE    | 로그인 조회 최적화          |
| Content       | key                    | UNIQUE    | 콘텐츠 키 조회              |
| Content       | category               | NORMAL    | 카테고리 필터링             |
| ChatMessage   | sessionId              | NORMAL    | 세션 메시지 조회             |
|%AuditLog      | userId@?userId             | NORMAL    | 사용자별 감사 조회           |
| AuditLog      | createdAt              | NORMAL    | 날짜 범위 필터링             |
| AuditLog      | entity + action        | COMPOSITE | 엔티티+액션 필터링           |
| Notification  | targetRole             | NORMAL    | 역할별 알림 조회             |
| Notification  | isRead                 | NORMAL    | 미읽음 알림 카운트           |
| UserActivity  | createdAt              | NORMAL    | 날짜 범위 통계               |
| UserActivity  | entity                 | NORMAL    | 엔티티별 통계                |
| ContentVersion| contentId              | NORMAL    | 콘텐츠 버전 조회             |
| OnboardingProgress| sessionId          | UNIQUE    | 세션별 온보딩 조회           |
| Permission    | role                   | UNIQUE    | 역할 권한 조회               |

### 4.2 인덱스 설계 원칙

- **선택도 기반**: 선택도가 10% 이하인 컬럼에 인덱스 생성
- **복합 인덱스 순서**: 등가 조건 컬럼 → 범위 조건 컬럼 순서
- **커버링 인덱스**: 빈번한 조회 �9쿼리는 포함 인덱스 검토
- **과잉 인덱스 방지**: 쓰기 빈도가 높은 �C테이블은 인덱스 최C 최소화

---

## 5. SQLite 제약 및 해결책

### 5.1 주요 제약

| 제약                     | 설명                                      | 영향                     |
|--------------------------|-------------------------------------------|--------------------------|
| 단일 Writer              | 동시 쓰기 불가 (WAL 모드로 부분 완화)   | 쓰기( 성, 성능 병목      |
| BOOLEAN 미지원          | INTEGER 0/1로 저장                        | Prisma가 자동 매핑       |
| ENUM 미지원             | String으로 저장: 저장                     | 앱 계층!에서 검!증 필요  |
| JSON 미지원             | TEXT로 저장                               | 수동 파싱/직렬화         |
| FOREIGN KEY 기본 비활성 | PRAGMA 필요                               | 연)결 시 반드시 활성1활성화 |
| 중첩 트랜잭션 미지원    | SAVEPOINT 사용 불가                      | 테C트 격1리! 어려움      |
| 최대 DB 크기 281TB      | 이론적 한계 (실제는 디스크 제약)         | 소~중 규모에 적합        |
| ALTER TABLE 제한        | 컬럼C럼 삭제/타입' 변경 제약적 지원       | 마이그레이션 복잡도 증가  |

### 5.2 해결책

| 제약                     | 해결책                                    |
|--------------------------|-------------------------------------------|
| 단일 Writer              | WAL 모드 활성화: `PRAGMA journal_mode=WAL`|
| BOOLEAN                  | Prisma Boolean 매핑에 의존 (0/1 ↔ false/true)|
| ENUM                     | Z8Zod/Valibot 스키마로 앱 계층 검증       |
| JSON                     | `Json()` Prisma 타입 + 앱 계층 파싱       |
| FOREIGN KEY              | `PRAGMA foreign_keys=ON` (연)결 시 설정)   |
| 중첩 트랜잭션            | 테스트 시 인메모리 DB 인스1인스 분리      |
| ALTER TABLE             ?| Prisma 마이그레이션으로 테이블 재생성     |

---

## 6. PostgreSQL 마이그레이션 체크리스트

| # | 항목                           | 상태 | 비고                                |
|---|--------------------------------|------|-------------------------------------|
| 1 | datasource provider 변경       | ☐    | `provider = "postgresql"`           |
| 2 | 연결 문자열 변경               | ☐    | `postgresql://user:pass@host:5432/db`|
| 3 | BOOLEAN 타입 매핑 확인         | ☐    | SQLite INTEGER → PG BOOLEAN 자동   |
| 4 | DateTime 타입 확인             | ☐    | PG TIMESTAMP WITH TIME ZONE 권장   |
| 5 | JSON 타입 활용                 | ☐    | `changes` 필드를 PG native JSONB로  |
| 6 | ENUM 타입 도입 검토            | ☐    | role, action, entity 등 PG ENUM    |
| 7 | 배열 타입 검토                 | ☐    | 반0'복 데이터를 PG ARRAY로         |
| 8 | 인덱스 재설계                   | ☐    | 부분 인덱스, GIN 인덱스 활용       |
| 9 | 풀 연결 설정                   | ☐    | `pgbouncer` 연결 풀 도입           |
|10 | 백업 전략 변경                 | ☐    | `pg_dump` + WAL 아카이빙           |
|11 | 시퀀스/CUID 전환               | ☐    | PG SERIAL 또는 CUID 유지 결정      |
|12 | full-text search               | ☐    | PG tsvector + tsindex 검토         |

---

## 7. MySQL 마이그레이션 체크리스트

| # | 항목=                          | 상태 | 비고                                 |
|---|--------------------------------|:----:|--------------------------------------|
| 1 | datasource provider 변경       | ☐    | `provider = "mysql"`                 |
| 2 | 연결 문자열 변경               | ☐    | `mysql://user:pass@host:3306/db`     |
| 3 | BOOLEAN 타입 확인              | ☐    | TINYINT(1) ↔ Boolean 매핑           |
| 4 | DateTime 정밀도                | ☐    | DATETIME(3) 권장 (ms 정밀도)        |
| 5 | JSON 타입 활용                 | ☐    | MySQL 5.7+ native JSON 지원         |
| 6 | 문자셋 설정                    | ☐    | `utf8mb4` + `utf8mb4_unicode_ci`    |
| 7 | 인덱스 재설계                   | ☐    | InnoDB 프라이'머리 키 클러스터링   |
| 8 | 풀 연결 설정                   | ☐    | 커넥션 풀 크기 튜닝                |
| 9 | 백업 전략 변경                 | ☐    | `mysqldump` + 바이너리 로그         |
|10 | AUTO_INCREMENT/CUID             | ☐    | AUTO_INCREMENT 또는 CUID 유지 결정  |
|11 | 외래 키 제약 확인              | ☐    | `FOREIGN_KEY_CHECKS` 설정           |

---

## 8. 데이터 시드 전략 (Data Seeding)

### 8.1 시드 파일 구조

```
prisma/
├── seed.ts          # 메인 시드 엔트리
└── fixtures/
    ├── admin.ts      # 관리자 계정 시드
    ├── content.ts    # CMS 콘텐츠 시드
    ├── permission.ts # 역할별 권한 시드
    └── config.ts     # 사이트 설정 시드
```

### 8.2 기본 시드 데이터

| 모델          | 시드 데이터                                    | 수량 |
|---------------|-----------------------------------------------|------|
| AdminUser     | superadmin 1명 (admin@platform.local)         | 1    |
| Permission    | superadmin, admin, editor, viewer 4역할        | 4    |
| SiteConfig    | 기본 설정 (siteName, language=ko)             | 1    |
| Content       | 홈, 채팅, 이미지, 퀴즈 기본 콘텐츠           | ~30  |
| AiSettings    | 기본 Provider (zai-built-in)                  | 1    |
| Notification  | 환영 알림 1건                                | 1    |

### 8.3 시드 실행 명령

```bash
bun run db:push    # 스키마 적용
bun prisma db seed # 시드 데이터 주입
```

### 8.4 idempotent 시드 원칙

-G- `upsert` 패턴 사용: 이미 존재 시 업데이트, 없으면 생성
- 시드 재실행 시 중복 데이터 방지
- 외래 키 의존 순서: Permission → AdminUser → SiteConfig → Content

---

## 9. 백업 절차 (Backup Procedures)

### 9.1 SQLite 백업

| 방식              | 명령                                    | 주기       | 보존     |
|-------------------|-----------------------------------------|------------|----------|
| 파일 복사         | `cp db/custom.db db/backup/db_$(date +%F).db` | 일일      | 30일    |
| SQLite Dump       | `sqlite3 db/custom.db .dump > backup.sql`     | 주간      | 12주    |
| 온라인 백업       | `sqlite3 db/custom.db "VACUUM INTO 'backup.db'"` | 실시간   | 최신    |

### 9.2 백업 자동화 스크립트

```bash
#!/bin/bash
BACKUP_DIR="./backups"
DB_FILE="./db/custom.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 일일 파일 복사
cp "$DB_FILE" "$BACKUP_DIR/db_${TIMESTAMP}.db"

# 30일 이상 된 백업 삭제
find "$BACKUP_DIR" -name "db_*.db" -mtime +30 -delete

# 주간 SQL 덤프 (일요일만)
if [ $(date +%u) -eq 7 ]; then
  sqlite3 "$DB_FILE" .dump > "$BACKUP_DIR/dump_${TIMESTAMP}.sql"
  find "$BACKUP_DIR" -name "dump_*.sql" -mtime +84 -delete
fi
```

### 9.3 복원 절차

1. 애플리케이션 중지
2. 현재 DB 파일 백업 (안전망)
3. 백업 파일을 DB 경로에 복원
4. `PRAGMA integrity_check` 실행
5. 애플리케이션 재시작
6. 감사 로그에 복원 이력 기록

### 9.4 재해 복구 RTO/RPO

| 지표 | 목표      | 설명                           |
|------|-----------|--------------------------------|
| RTO  | < 30분    | 복원 완료까지 최대 30분       |
| RPO  | < 24시간  | 일일 백업 기준 최대 1일 손실  |

---

## 10. 요약

�"본 데이터베이스 설계는 13개 Prisma 모델로 구성되며, ER 관계(1:N 3곳, 단일 행 2곳)를
명확히 정의합니다. SQLite 기반 개발 환경에서 인덱싱, 시드, 백업 전략을 수립하고,
PostgreSQL 및 MySQL 마이그레이션 체크리스트를 제공하여 프로덕션 전환 시 누락 없이
대응할 수 있도록 설계되었습니다.
