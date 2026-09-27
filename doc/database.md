# Database (데이터베이스 설계 문서)

## AI 플랫폼 관리자 대시보드 데이터베이스 스키마

| 항목 | 내용 |
|------|------|
| DBMS | SQLite |
| ORM | Prisma 6.x |
| 파일 | prisma/schema.prisma |
| 데이터 파일 | db/custom.db |
| 모델 수 | 13개 |
| 작성일 | 2025-08-12 |

---

## 1. ER 다이어그램

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AiSettings  │     │ ChatSession  │     │  QuizResult  │
│  (Singleton) │     │              │     │              │
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ provider     │     │ title        │     │ difficulty   │
│ openaiKey    │     │ provider     │     │ score        │
│ geminiKey    │     │ createdAt    │     │ total        │
│ grokKey      │     │ updatedAt    │     │ createdAt    │
│ claudeKey    │     └──────┬───────┘     └──────────────┘
│ updatedAt    │            │ 1:N
│ createdAt    │     ┌──────┴───────┐
└──────────────┘     │ ChatMessage  │     ┌──────────────┐
                     │              │     │ ImageHistory │
                     │ id (PK)      │     │              │
                     │ sessionId(FK)│     │ id (PK)      │
                     │ role         │     │ style        │
                     │ content      │     │ imageUrl     │
                     │ createdAt    │     │ createdAt    │
                     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AdminUser   │    GK   │   Content    │     │  SiteConfig  │
│              │     │              │     │  (Singleton) │
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ email (UQ)   │     │ key (UQ)     │     │ siteName     │
│ name         │     │ category     │     │ siteDescription│
│ passwordHash │     │ type         │     │ logoUrl      │
│ role         │     │ value        │     │ layoutMode   │
│ isActive     │     │ label        │     │ language     │
│ lastLoginAt  │     │ description  │     │ maintenanceMode│
│ createdAt    │     │ sortOrder    │     │ mockMode     │
│ updatedAt    │     │ updatedBy    │     │ updatedAt    │
└──────┬───────┘     │ updatedAt    │     │ createdAt    │
       │ 1:N         │ createdAt    │     └──────────────┘
       │             └──────────────┘
┌──────┴───────┐
│   AuditLog   │     ┌──────────────┐
│              │     │  Permission  │
│ id (PK)      │     │              │
│ userId (FK)  │────→│ id (PK)      │
│ userEmail    │     │ role (UQ)    │
│ action       │     │ canManageUsers│
│ entity       │     │ canManageContent│
│ entityId     │     │ canManageConfig│
│ changes      │     │ canViewAudit │
│ ip           │     │ canDeleteContent│
│ createdAt    │     │ canManageAPIKeys│
└──────────────┘     │ canManageNotifications│
                     │ canExportData│
                     │ canViewAnalytics│
                     │ createdAt    │
                     │ updatedAt    │
                     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Notification│     │ UserActivity │     │ContentVersion│
│              │     │              │     │              │
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ type         │     │ userId (FK)  │     │ contentId(FK)│
│ title        │     │ action       │     │ version      │
│ message      │     │ entity       │     │ value        │
│ isRead       │     │ entityId     │     │ changedBy    │
│ userId (FK)  │     │ metadata     │     │ createdAt    │
│ createdAt    │     │ createdAt    │     └──────────────┘
│ updatedAt    │     └──────────────┘
└──────────────┘     ┌──────────────┐
                     │OnboardingProg│
                     │              │
                     │ id (PK)      │
                     │ userId (FK)  │
                     │ step         │
                     │ completed    │
                     │ createdAt    │
                     │ updatedAt    │
                     └──────────────┘
```

---

## 2. 테이블 상세

### 2.1 AiSettings (기존)
AI 제공자 설정 (Singleton 패턴)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default("default") | 고정 ID |
| provider | String | default("zai-built-in") | 활성 AI 제공자 |
| openaiKey | String | nullable | OpenAI API 키 |
| geminiKey | String | nullable | Gemini API 키 |
| grokKey | String | nullable | xAI Grok API 키 |
| claudeKey | String | nullable | Claude API 키 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |
| createdAt | DateTime | @default(now()) | 생성일 |

---

### 2.2 ChatSession (기존)
채팅 세션 정보

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 세션 고유 ID |
| title | String |" nullable" | 세션 제목 |
| provider | String | default("zai-built-in") | 사용된 AI 제공자 |
| createdAt | DateTime | @default(now()) | 생성일 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |

**관계**: ChatMessage 1:N (Cascade Delete)

---

### 2.3 ChatMessage (기존)
채팅 메시지

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 메시지 고유 ID |
| sessionId | String | FK → ChatSession.id | 소속 세션 |
| role | String | not null | 역할 (user/assistant/system) |
| content | String | not null | 메시지 내용 |
| createdAt | DateTime | @default(now()) | 생성일 |

**관계**: ChatSession N:1 (Cascade Delete)

---

### 2.4 QuizResult (기존)
퀴즈 결과 기록

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 결과 고유 ID |
| difficulty | String | default("easy") | 난이도 |
| score | Int | default(0) | 정답 수 |
| total | Int | default(0) | 전체 문제 수 |
| createdAt | DateTime | @default(now()) | 완료일 |

---

### 2.5 ImageHistory (기존)
이미지 변환 이력

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 이력 고유 ID |
| style | String | nullable | 변환 스타일 |
| imageUrl | String | nullable | 결과 이미지 URL |
| createdAt | DateTime | @default(now()) | 생성일 |

---

### 2.6 AdminUser (신규)
관리자 사용자 계정

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 사용자 고유 ID |
| email | String | @unique | 이메일 (로그인 ID) |
| name | String | not null | 표시 이름 |
| passwordHash | String | not null | bcrypt 해시 (10 rounds) |
| role | String | default("editor") | 역할 (superadmin/admin/editor/viewer) |
| isActive | Boolean | default(true) | 활성 상태 |
| lastLoginAt | DateTime | nullable | 최종 로그인 시간 |
| createdAt | DateTime | @default(now()) | 생성일 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |

**관계**: AuditLog 1:N (onDelete: SetNull), UserActivity 1:N, OnboardingProgress 1:N

**설계 의사결정**:
- passwordHash는 절대 API 응답에 포함하지 않음
- email에 unique 제약으로 중복 가입 방지
- 마지막 superadmin 보호 로직은 애플리케이션 레이어에서 구현

---

### 2.7 Content (신규)
CMS 콘텐츠 항목

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 항목 고유 ID |
| key | String | @unique | 콘텐츠 키 (예: home.hero.title) |
| category | String | default("general") | 카테고리 |
| type | String | default("text") | 타입 (text/image/rich_text/json/color/url) |
| value | String | not null | 콘텐츠 값 |
| label | String | nullable | 관리자 UI 라벨 |
| description | String | nullable | 관리자용 설명 |
| sortOrder | Int | default(0) |= 정렬 순서 |
| updatedBy | String | nullable | 마지막 수정자 이메일 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |
| createdAt | DateTime | @default(now()) | 생성일 |

**관계**: ContentVersion 1:N

**키 네이밍 컨벤션**: `{category}.{section}.{field}` (예: `home.hero.title`, `chat.welcome`)

---

### 2.8 SiteConfig (신규)
사이트 전역 설정 (Singleton 패턴)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default("default") | 고정 ID |
| siteName | String | default("AI 플랫폼") | 사이트 이름 |
| siteDescription | String | default("AI와 대화하고...") | 사이트 설명 |
| logoUrl | String | nullable | 로고 이미지 URL |
| faviconUrl | String | nullable | 파비콘 URL |
| primaryColor | String | default("") | 기본 색상 |
| layoutMode | String | default("8auto") | 레이아웃 모드 |
| language | String | default("ko") | 언어 |
| maintenanceMode | Boolean | default(false) | 유지보수 모드 |
| mockMode | Boolean | default(false) | Mock 모드 (개발/데모용) |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |
| createdAt | DateTime | @default(now()) | 생성일 |

**layoutMode 값**: auto, kiosk-21, kiosk-32, desktop, tablet, mobile

---

### 2.9 AuditLog (신규)
감사 로그

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 로그 고유 ID |
| userId | String | nullable, FK → AdminUser.id | 작업자 ID |
| userEmail | String | nullable | 작업자 이메일 (비정규화) |
| action | String | not null | 액션 (create/update/delete/login/logout) |
| entity | String | not null | 엔티티 (content/user/config/settings) |
| entityId | String | nullable | 대상 엔티티 ID |
| changes | String | nullable | 변경 내용 (JSON 문자열) |
| ip | String | nullable | 요청자 IP |
| createdAt | DateTime | @default(now()) | 발생 시간 |

**관계**: AdminUser N:1 (onDelete: SetNull — 사용자 삭제 시 로그는 보존)

**설계 의사결정**:
- userEmail 비정규화: 사용자 삭제 후에도 이메일 확인 가능
- changes: JSON 문자열로 유연한 변경 내용 저장
- onDelete: SetNull — 사용자 삭제 시 userId만 null, 로그 자체는 보존

---

### 2.10 Permission (신규)
역할별 권한 정의

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 권한 고유 ID |
| role | String | @unique | 역할 (superadmin/admin/editor/viewer) |
| canManageUsers | Boolean | default(false) | 사용자 관리 권한 |
| canManageContent | Boolean | default(true) | 콘텐츠 관리 권한 |
| canManageConfig | Boolean | default(false) | 설정 관리 권한 |
| canViewAudit | Boolean | default(false) | 감사 로그 열람 권한 |
| canDeleteContent | Boolean | default(false) | 콘텐츠 삭제 권한 |
| canManageAPIKeys | Boolean | default(false) | API 키 관리 권한 |
| canManageNotifications | Boolean | default(false) | 알림 관리 권한 |
| canExportData | Boolean | default(false) | 데이터 내보내기 권한 |
| canViewAnalytics | Boolean | default(false) | 분석 열람 권한 |
| createdAt | DateTime | @default(now()) | 생성일 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |

---

### 2.11 Notification (신규)
알림 항목

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 알림 고유 ID |
| type | String | not null | 알림 유형 (info/warning/error/success) |
| title | String | not null | 알림 제목 |
| message | String | not null | 알림 메시지 |
| isRead | Boolean | default(false) | 읽음 상태 |
| userId | String | nullable, FK → AdminUser.id | 대상 사용자 ID |
| createdAt | DateTime | @default(now()) | 생성일 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |

**관계**: AdminUser N:1 (onDelete: Cascade)

---

### 2.12 UserActivity (신규)
사용자 활동 기록

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 활동 고유 ID |
| userId | String | FK → AdminUser.id | 사용자 ID |
| action | String | not null | 액션 (login/view/edit/create/delete) |
| entity | String | not null | 엔티티 (content/user/config/notification 등) |
| entityId | String | nullable | 대상 엔티티 ID |
| metadata | String | nullable | 추가 메타데이터 (JSON 문자열) |
| createdAt | DateTime | @default(now()) | 발생 시간 |

**관계**: AdminUser N:1 (onDelete: Cascade)

---

### 2.13 ContentVersion (신규)
콘텐츠 버전 이력

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 버전 고유 ID |
| contentId | String | FK → Content.id | 소속 콘텐츠 ID |
| version | Int | not null | 버전 번호 (1부터 순차) |
| value | String | not null | 해당 버전의 값 |
| changedBy | String | nullable | 변경자 이메일 |
| createdAt | DateTime | @default(now()) | 생성일 |

**관계**: Content N:1 (onDelete: Cascade)

---

### 2.14 OnboardingProgress (신규)
온보딩 진행 상태

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | PK, @default(cuid()) | 진행 고유 ID |
| userId | String | FK → AdminUser.id | 사용자 ID |
| step | String | not null | 온보딩 단계 식별자 |
| completed | Boolean | default(false) | 완료 여부 |
| createdAt | DateTime | @default(now()) | 생성일 |
| updatedAt | DateTime | @updatedAt | 최종 수정일 |

**관계**: AdminUser N:1 (onDelete: Cascade)

---

## 3. Prisma 스키마

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 기존 AI 플랫폼 모델
model AiSettings { ... }
model ChatSession { ... }
model ChatMessage { ... }
model QuizResult { ... }
model ImageHistory { ... }

// 관리자 대시보드 모델
model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  role         String    @default("editor")
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  auditLogs    AuditLog[]
  activities   UserActivity[]
  onboardingProgress OnboardingProgress[]
}

model Content {
  id          String   @id @default(cuid())
  key         String   @unique
  category    String   @default("general")
  type        String   @default("text")
  value       String
  label       String?
  description String?
  sortOrder   Int      @default(0)
  updatedAt   DateTime @updatedAt
  updatedBy   String?
  createdAt   DateTime @default(now())
  versions    ContentVersion[]
}

model SiteConfig {
  id              String   @id @default("default")
  siteName        String   @default("AI 플랫폼")
  siteDescription String   @default("AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.")
  logoUrl         String?
  faviconUrl      String?
  primaryColor    String   @default("")
  layoutMode      String   @default("auto")
  language        String   @default("ko")
  maintenanceMode Boolean  @default(false)
  mockMode        Boolean  @default(false)
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  userEmail String?
  action    String
  entity    String
  entityId  String?
  changes   String?
  ip        String?
  createdAt DateTime @default(now())
  user      AdminUser? @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model Permission {
  id                    String   @id @default(cuid())
  role                  String   @unique
  canManageUsers        Boolean  @default(false)
  canManageContent      Boolean  @default(true)
  canManageConfig       Boolean  @default(false)
  canViewAudit          Boolean  @default(false)
  canDeleteContent      Boolean  @default(false)
  canManageAPIKeys      Boolean  @default(false)
  canManageNotifications Boolean @default(false)
  canExportData         Boolean  @default(false)
  canViewAnalytics      Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Notification {
  id        String    @id @default(cuid())
  type      String
  title     String
  message   String
  isRead    Boolean   @default(false)
  userId    String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      AdminUser? @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserActivity {
  id        String   @id @default(cuid())
  userId    String
  action    String
  entity    String
  entityId  String?
  metadata  String?
  createdAt DateTime @default(now())
  user      AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ContentVersion {
  id        String   @id @default(cuid())
  contentId String
  version   Int
  value     String
  changedBy String?
  createdAt DateTime @default(now())
  content   Content  @relation(fields: [contentId], references: [id], onDelete: Cascade)
}

model OnboardingProgress {
  id        String   @id @default(cuid())
  userId    String
  step      String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 4. 데이터 접근 패턴

### 4.1 관리자 인증
```typescript
// 이메일로 사용자 조회
const user = await db.adminUser.findUnique({ where: { email } })

// 마지막 로그인 시간 업데이트
await db.adminUser.update({
  where: { id: userId },
  data: { lastLoginAt: new Date() }
})
```

### 4.2 CMS 콘텐츠
```typescript
// 카테고리별 콘텐츠 조회
const contents = await db.content.findMany({
  where: category ? { category } : {},
  orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
})

// 키로 단일 콘텐츠 조회
const content = await db.content.findUnique({ where: { key } })

// 공개 API: 키-값 맵 변환
const contents = await db.content.findMany({ where: category ? { category } : {} })
const map = Object.fromEntries(contents.map(c => [c.key, c.value]))
```

### 4.3 감사 로그
```typescript
// 페이지네이션 + 필터
const [logs, total] = await Promise.all([
  db.auditLog.findMany({
    where: { action?, entity?, userId? },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' }
  }),
  db.auditLog.count({ where: { action?, entity?, userId? } })
])
```

### 4.4 권한
```typescript
// 역할/권한 조회
const perm = await db.permission.findUnique({ where: { role } })

// 권한 업데이트
await db.permission.update({
  where: { role },
  data: { canManageUsers, canManageContent, canManageNotifications, canExportData, canViewAnalytics, ... }
})
```

### 4.5 사이트 설정 (Singleton)
```typescript
// 조회
const config = await db.siteConfig.findUnique({ where: { id: 'default' } })

// Upsert
await db.siteConfig.upsert({
  where: { id: 'default' },
  update: { siteName, siteDescription, mockMode, ... },
  create: { id: 'default', siteName, siteDescription, mockMode, ... }
})
```

### 4.6 알림
```typescript
// 사용자별 알림 조회
const notifications = await db.notification.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
})

// 읽음 처리
await db.notification.update({
  where: { id },
  data: { isRead: true }
})
```

### 4.7 사용자 활동
```typescript
// 활동 기록
await db.userActivity.create({
  data: { userId, action, entity, entityId, metadata: JSON.stringify(meta) }
})

// 사용자별 활동 조회
const activities = await db.userActivity.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  take: 50
})
```

### 4.8 콘텐츠 버전
```typescript
// 새 버전 생성
const content = await db.content.findUnique({ where: { id: contentId } })
const lastVersion = await db.contentVersion.count({ where: { contentId } })
await db.contentVersion.create({
  data: { contentId, version: lastVersion + 1, value: content.value, changedBy }
})
```

---

## 5. 마이그레이션 전략: SQLite → PostgreSQL/MySQL

### 5.1 스키마 변경 사항

| 항목 | SQLite | PostgreSQL/MySQL |
|------|--------|-----------------|
| datasource provider | sqlite | postgresql / mysql |
| @default(cuid()) | 호환 | 호환 |
| DateTime | 호환 | 호환 (timestamp) |
| String @unique | 호환 | 호환 (인덱스 자동 생성) |
| Boolean | 호환 | 호환 |

### 5.2 마이그레이션 단계

```
1. 스키마 수정: datasource provider 변경
2. 데이터 이동: sqlite3 → pg_dump/mysql_dump 스크립트
3. 연결 문자열 변경: DATABASE_URL
4. Prisma 마이그레이션: bun run db:push
5. 검증: 데이터 무결성 확인
```

### 5.3 스키마 진화 고려사항

| 변경 | 영향 | 대응 |
|------|------|------|
| 새 권한 추가 | Permission 모델에 컬럼 추가 | db:push + 기존 역할 기본값 설정 |
| 콘텐츠 버전 관리 | ContentVersion 모델 추가 (완료) | 기존 Content와 1:N 관계 |
| 파일 업로드 | Media 모델 추가 | Content.value에 참조 ID 저장 |
| 다국어 | Content에 locale 컬럼 추가 | key + locale 복합 unique |
| 알림 시스템 | Notification 모델 추가 (완료) | PWA 푸시 + 인앱 알림 |
| 사용자 활동 | UserActivity 모델 추가 (완료) | 분석 대시보드 데이터 소스 |

---

## 6. 초기 데이터

### 6.1 기본 관리자 계정
```
이메일: admin@aiplatform.kr
비밀번호: admin123
역할: superadmin
```

### 6.2 기본 권한

| 역할 | canManageUsers | canManageContent | canManageConfig | canViewAudit | canDeleteContent | canManageAPIKeys | canManageNotifications | canExportData | canViewAnalytics |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| superadmin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| editor | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 6.3 기본 사이트 설정
```
siteName: "AI 플랫폼"
siteDescription: "AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요."
layoutMode: "auto"
language: "ko"
maintenanceMode: false
mockMode: false
```

### 6.4 기본 알림 시드
```
type: "info"
title: "플랫폼 업데이트"
message: "PWA 및 오프라인 지원이 추가되었습니다."
isRead: false
userId: null (전체 사용자 대상)
```
