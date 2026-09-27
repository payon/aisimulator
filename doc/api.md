# API (API 명세서)

## AI 플랫폼 관리자 API 명세서

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |
| Base URL | `/api/admin` |

---

## 1. 공통 사항

### 1.1 인증 헤더

모든 `/api/admin/*` 엔드포인트는 Bearer 토큰이 필요합니다.

```
Authorization: Bearer <token>
```

`/api/cms/content`, `/api/config`, `/api/notifications`는 공개 엔드포인트로 인증이 불필요합니다.

### 1.2 공통 응답 형식

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 1.3 에러 응답

| 상태 코드 | 의미 | 사례 |
|----------|------|------|
| 200 | 성공 | 정상 응답 |
| 400 | 잘못된 요청 | 필수 필드 누락, 입력 검증 실패 |
| 401 | 인증 실패 | 토큰 없음/만료/무효 |
| 403 | 권한 없음 | 역할에 필요한 권한이 없음 |
| 404 | 리소스 없음 | 콘텐츠 키/사용자 ID 없음 |
| 500 | 서버 오류 | DB 오류, 내부 예외 |

---

## 2. 인증 API — `/api/admin/auth`

### 2.1 POST /api/admin/auth — 로그인

**인증 불필요**

```json
// Request
{
  "email": "admin@aiplatform.kr",
  "password": "admin123"
}

// Response 200
{
  "success": true,
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "clxxx...",
    "email": "admin@aiplatform.kr",
    "name": "관리자",
    "role": "superadmin"
  }
}

// Response 401
{
  "success": false,
  "error": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

### 2.2 DELETE /api/admin/auth — 로그아웃

**인증 필요**

```json
// Request Header
Authorization: Bearer <token>

// Response 200
{
  "success": true
}
```

### 2.3 GET /api/admin/auth — 세션 확인

**인증 필요**

```json
// Request Header
Authorization: Bearer <token>

// Response 200 (유효)
{
  "success": true,
  "user": {
    "id": "clxxx...",
    "email": "admin@aiplatform.kr",
    "name": "관리자",
    "role": "superadmin"
  }
}

// Response 401 (무효)
{
  "success": false,
  "error": "인증이 필요합니다."
}
```

---

## 3. 콘텐츠 관리 API — `/api/admin/content`

### 3.1 GET /api/admin/content — 콘텐츠 목록

**권한**: canManageContent

```json
// Query Parameters
?category=home        // 선택: 카테고리 필터

// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "key": "home.hero.title",
      "category": "home",
      "type": "text",
      "value": "AI 플랫폼",
      "label": "홈 제목",
      "description": "홈 화면 메인 제목",
      "sortOrder": 0,
      "updatedBy": "admin@aiplatform.kr",
      "createdAt": "2025-08-11T00:00:00.000Z",
      "updatedAt": "2025-08-11T00:00:00.000Z"
    }
  ]
}
```

### 3.2 POST /api/admin/content — 콘텐츠 생성

**권한**: canManageContent

```json
// Request
{
  "key": "home.hero.subtitle",
  "category": "home",
  "type": "text",
  "value": "AI와 함께하는 스마트 라이프",
  "label": "홈 부제목",
  "description": "홈 화면 부제목 텍스트"
}

// Response 200
{
  "success": true,
  "data": { /* 생성된 콘텐츠 객체 */ }
}
```

### 3.3 PUT /api/admin/content — 콘텐츠 수정 (ID)

**권한**: canManageContent

```json
// Request
{
  "id": "clxxx...",
  "value": "수정된 값",
  "label": "수정된 라벨"
}

// Response 200
{
  "success": true,
  "data": { /* 수정된 콘텐츠 객체 */ }
}
```

### 3.4 DELETE /api/admin/content — 콘텐츠 삭제 (ID)

**권한**: canDeleteContent

```json
// Request
{
  "id": "clxxx..."
}

// Response 200
{
  "success": true
}
```

---

## 4. 단일 콘텐츠 API — `/api/admin/content/[key]`

### 4.1 GET /api/admin/content/[key] — 키로 조회

**권한**: canManageContent

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "key": "home.hero.title",
    "value": "AI 플랫폼",
    ...
  }
}

// Response 404
{
  "success": false,
  "error": "콘텐츠를 찾을 수 없습니다."
}
```

### 4.2 PUT /api/admin/content/[key] — 키로 수정

**권한**: canManageContent

```json
// Request
{
  "value": "새로운 제목",
  "label": "새 라벨"
}

// Response 200
{
  "success": true,
  "data": { /* 수정된 콘텐츠 객체 */ }
}
```

### 4.3 DELETE /api/admin/content/[key] — 키로 삭제

**권한**: canDeleteContent

```json
// Response 200
{
  "success": true
}
```

---

## 5. 사용자 관리 API — `/api/admin/users`

### 5.1 GET /api/admin/users — 사용자 목록

**권한**: canManageUsers

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "email": "admin@aiplatform.kr",
      "name": "관리자",
      "role": "superadmin",
      "isActive": true,
      "lastLoginAt": "2025-08-11T12:00:00.000Z",
      "createdAt": "2025-08-11T00:00:00.000Z"
    }
  ]
}
```

> **주의**: `passwordHash`는 절대 응답에 포함되지 않습니다.

### 5.2 POST /api/admin/users — 사용자 생성

**권한**: canManageUsers

```json
// Request
{
  "email": "editor@aiplatform.kr",
  "name": "편집자",
  "password": "securepass123",
  "role": "editor"
}

// Response 200
{
  "success": true,
  "data": { /* 생성된 사용자 (passwordHash 제외) */ }
}
```

### 5.3 PUT /api/admin/users — 사용자 수정

**권한**: canManageUsers

```json
// Request
{
  "id": "clxxx...",
  "name": "수정된 이름",
  "role": "admin",
  "isActive": true,
  "password": "newpassword"    // 선택: 비밀번호 변경 시
}

// Response 200
{
  "success": true,
  "data": { /* 수정된 사용자 */ }
}
```

### 5.4 DELETE /api/admin/users — 사용자 삭제

**권한**: canManageUsers

```json
// Request
{
  "id": "clxxx..."
}

// Response 200
{ "success": true }

// Response 403 (마지막 superadmin 또는 자기 자신)
{ "success": false, "error": "..." }
```

---

## 6. 권한 관리 API — `/api/admin/roles`

### 6.1 GET /api/admin/roles — 권한 목록

**권한**: canManageUsers

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "role": "superadmin",
      "canManageUsers": true,
      "canManageContent": true,
      "canManageConfig": true,
      "canViewAudit": true,
      "canDeleteContent": true,
      "canManageAPIKeys": true,
      "canManageNotifications": true,
      "canExportData": true,
      "canViewAnalytics": true
    },
    {
      "role": "admin",
      "canManageUsers": true,
      "canManageContent": true,
      "canManageConfig": true,
      "canViewAudit": true,
      "canDeleteContent": true,
      "canManageAPIKeys": false,
      "canManageNotifications": true,
      "canExportData": true,
      "canViewAnalytics": true
    },
    {
      "role": "editor",
      "canManageUsers": false,
      "canManageContent": true,
      "canManageConfig": false,
      "canViewAudit": false,
      "canDeleteContent": false,
      "canManageAPIKeys": false,
      "canManageNotifications": false,
      "canExportData": false,
      "canViewAnalytics": false
    },
    {
      "role": "viewer",
      "canManageUsers": false,
      "canManageContent": false,
      "canManageConfig": false,
      "canViewAudit": false,
      "canDeleteContent": false,
      "canManageAPIKeys": false,
      "canManageNotifications": false,
      "canExportData": false,
      "canViewAnalytics": false
    }
  ]
}
```

### 6.2 PUT /api/admin/roles — 권한 수정

**권한**: canManageUsers + superadmin 역할

```json
// Request
{
  "role": "editor",
  "canManageUsers": false,
  "canManageContent": true,
  "canManageConfig": false,
  "canViewAudit": true,
  "canDeleteContent": false,
  "canManageAPIKeys": false,
  "canManageNotifications": false,
  "canExportData": false,
  "canViewAnalytics": false
}

// Response 200
{
  "success": true,
  "data": { /* 수정된 권한 객체 */ }
}
```

---

## 7. 감사 로그 API — `/api/admin/audit`

### 7.1 GET /api/admin/audit — 감사 로그 조회

**권한**: canViewAudit

```json
// Query Parameters
?page=1               // 페이지 번호 (기본 1)
&limit=20             // 페이지 크기 (기본 20)
&action=update        // 액션 필터 (create/update/delete/login/logout)
&entity=content       // 엔티티 필터 (content/user/config/settings)
&userId=clxxx...      // 사용자 ID 필터

// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "userId": "clxxx...",
      "userEmail": "admin@aiplatform.kr",
      "action": "update",
      "entity": "content",
      "entityId": "clyyy...",
      "changes": "{\"key\":\"home.hero.title\",\"from\":\"AI\",\"to\":\"AI 플랫폼\"}",
      "ip": "192.168.1.1",
      "createdAt": "2025-08-11T12:34:56.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

## 8. 사이트 설정 API — `/api/admin/config`

### 8.1 GET /api/admin/config — 설정 조회

**권한**: canManageConfig

```json
// Response 200
{
  "success": true,
  "data": {
    "siteName": "AI 플랫폼",
    "siteDescription": "AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.",
    "logoUrl": null,
    "faviconUrl": null,
    "primaryColor": "",
    "layoutMode": "auto",
    "language": "ko",
    "maintenanceMode": false,
    "mockMode": false
  }
}
```

### 8.2 PUT /api/admin/config — 설정 수정

**권한**: canManageConfig

```json
// Request
{
  "siteName": "AI 배움터",
  "siteDescription": "시니어를 위한 AI 플랫폼",
  "layoutMode": "kiosk-21",
  "maintenanceMode": false,
  "mockMode": false
}

// Response 200
{
  "success": true,
  "data": { /* 수정된 설정 객체 */ }
}
```

---

## 9. 대시보드 통계 API — `/api/admin/stats`

### 9.1 GET /api/admin/stats — 통계 조회

**인증 필요** (특정 권한 불필요)

```json
// Response 200
{
  "success": true,
  "data": {
    "contentCount": 42,
    "userCount": 5,
    "chatSessionCount": 128,
    "quizResultCount": 67,
    "imageHistoryCount": 34,
    "auditLogCount": 215,
    "activeSessions": 2,
    "notificationCount": 15,
    "activityCount": 340
  }
}
```

---

## 10. 공개 CMS API — `/api/cms/content`

### 10.1 GET /api/cms/content — 콘텐츠 조회 (공개)

**인증 불필요**

```json
// Query Parameters
?category=home        // 선택: 카테고리 필터

// Response 200
{
  "success": true,
  "content": {
    "home.hero.title": "AI 플랫폼",
    "home.hero.subtitle": "AI와 함께하는 스마트 라이프",
    "home.hero.description": "대화, 이미지, 미래, 퀴즈...",
    "chat.welcome": "안녕하세요! AI 교사입니다.",
    "image.styles.watercolor.label": "수채화",
    "global.site.name": "AI 플랫폼"
  }
}
```

> 프론트엔드에서 `useCmsContent` 훅을 통해 30초 캐시와 함께 소비됩니다.

---

## 11. PWA API — `/api/pwa`

### 11.1 POST /api/pwa/subscribe — 푸시 구독 등록

**인증 불필요** (클라이언트 PWA에서 호출)

```json
// Request
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNb...",
      "auth": "abc..."
    }
  }
}

// Response 200
{
  "success": true
}

// Response 400
{
  "success": false,
  "error": "구독 정보가 유효하지 않습니다."
}
```

### 11.2 POST /api/pwa/notify — 푸시 알림 발송

**인증 필요** (관리자 또는 시스템에서 호출)

```json
// Request
{
  "title": "새 알림",
  "body": "새로운 콘텐츠가 업데이트되었습니다.",
  "icon": "/icons/icon-192x192.png",
  "url": "/"
}

// Response 200
{
  "success": true,
  "sent": 5,
  "failed": 0
}

// Response 401
{
  "success": false,
  "error": "인증이 필요합니다."
}
```

---

## 12. 알림 API — `/api/notifications`, `/api/admin/notifications`

### 12.1 GET /api/notifications — 공개 알림 목록

**인증 불필요**

```json
// Query Parameters
?limit=10              // 개수 제한 (기본 10)

// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "type": "info",
      "title": "플랫폼 업데이트",
      "message": "PWA 및 오프라인 지원이 추가되었습니다.",
      "isRead": false,
      "createdAt": "2025-08-12T00:00:00.000Z"
    }
  ]
}
```

### 12.2 GET /api/admin/notifications — 관리자 알림 목록

**권한**: canManageNotifications

```json
// Query Parameters
?page=1               // 페이지 번호
&limit=20             // 페이지 크기
&type=info            // 타입 필터 (info/warning/error/success)
&isRead=false         // 읽음 상태 필터

// Response 200
{
  "success": true,
  "data": [ /* Notification 객체 배열 */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

### 12.3 POST /api/admin/notifications — 알림 생성

**권한**: canManageNotifications

```json
// Request
{
  "type": "info",
  "title": "새 알림",
  "message": "시스템 점검이 예정되어 있습니다.",
  "userId": "clxxx..."   // 선택: 특정 사용자 대상 (null이면 전체)
}

// Response 200
{
  "success": true,
  "data": { /* 생성된 Notification 객체 */ }
}
```

### 12.4 GET /api/admin/notifications/[id] — 단일 알림 조회

**권한**: canManageNotifications

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "type": "info",
    "title": "플랫폼 업데이트",
    "message": "PWA 및 오프라인 지원이 추가되었습니다.",
    "isRead": false,
    "userId": null,
    "createdAt": "2025-08-12T00:00:00.000Z",
    "updatedAt": "2025-08-12T00:00:00.000Z"
  }
}

// Response 404
{
  "success": false,
  "error": "알림을 찾을 수 없습니다."
}
```

### 12.5 PUT /api/admin/notifications/[id] — 알림 수정

**권한**: canManageNotifications

```json
// Request
{
  "isRead": true
}

// Response 200
{
  "success": true,
  "data": { /* 수정된 Notification 객체 */ }
}
```

### 12.6 DELETE /api/admin/notifications/[id] — 알림 삭제

**권한**: canManageNotifications

```json
// Response 200
{
  "success": true
}
```

---

## 13. 사용자 활동 API — `/api/admin/activity`

### 13.1 GET /api/admin/activity — 사용자 활동 조회

**권한**: canViewAnalytics

```json
// Query Parameters
?page=1               // 페이지 번호 (기본 1)
&limit=20             // 페이지 크기 (기본 20)
&userId=clxxx...      // 사용자 ID 필터
&action=login         // 액션 필터
&entity=content       // 엔티티 필터

// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "userId": "clxxx...",
      "action": "login",
      "entity": "session",
      "entityId": null,
      "metadata": null,
      "createdAt": "2025-08-12T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 340,
    "totalPages": 17
  }
}
```

---

## 14. 권한 상세 API — `/api/admin/permissions`

### 14.1 GET /api/admin/permissions — 권한 목록

**권한**: canManageUsers

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "role": "superadmin",
      "canManageUsers": true,
      "canManageContent": true,
      "canManageConfig": true,
      "canViewAudit": true,
      "canDeleteContent": true,
      "canManageAPIKeys": true,
      "canManageNotifications": true,
      "canExportData": true,
      "canViewAnalytics": true,
      "createdAt": "2025-08-11T00:00:00.000Z",
      "updatedAt": "2025-08-12T00:00:00.000Z"
    }
  ]
}
```

### 14.2 GET /api/admin/permissions/[id] — 단일 권한 조회

**권한**: canManageUsers

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "role": "editor",
    "canManageUsers": false,
    "canManageContent": true,
    "canManageConfig": false,
    "canViewAudit": false,
    "canDeleteContent": false,
    "canManageAPIKeys": false,
    "canManageNotifications": false,
    "canExportData": false,
    "canViewAnalytics": false
  }
}

// Response 404
{
  "success": false,
  "error": "권한을 찾을 수 없습니다."
}
```

---

## 15. Mock 데이터 API — `/api/admin/mock`

### 15.1 GET /api/admin/mock — Mock 데이터 현황

**권한**: canManageConfig

```json
// Response 200
{
  "success": true,
  "data": {
    "enabled": true,
    "models": {
      "chatSessions": 12,
      "quizResults": 8,
      "imageHistory": 5,
      "notifications": 3,
      "userActivities": 45
    }
  }
}
```

### 15.2 POST /api/admin/mock — Mock 데이터 생성

**권한**: canManageConfig

```json
// Request
{
  "models": ["chatSessions", "quizResults", "notifications"],
  "count": 10
}

// Response 200
{
  "success": true,
  "data": {
    "created": {
      "chatSessions": 10,
      "quizResults": 10,
      "notifications": 10
    }
  }
}
```

### 15.3 POST /api/admin/mock/reset — Mock 데이터 초기화

**권한**: canManageConfig

```json
// Request
{
  "confirm": true   // 삭제 확인 플래그
}

// Response 200
{
  "success": true,
  "data": {
    "deleted": {
      "chatSessions": 12,
      "quizResults": 8,
      "imageHistory": 5,
      "notifications": 3,
      "userActivities": 45
    }
  }
}
```

---

## 16. 사이트 설정 공개 API — `/api/config`

### 16.1 GET /api/config — 공개 사이트 설정

**인증 불필요**

```json
// Response 200
{
  "success": true,
  "data": {
    "siteName": "AI 플랫폼",
    "siteDescription": "AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.",
    "layoutMode": "auto",
    "language": "ko",
    "maintenanceMode": false
  }
}
```

> 비인증 엔드포인트이므로 민감 정보(logoUrl, faviconUrl, primaryColor, mockMode)는 제외됩니다.

---

## 17. Rate Limiting

| 엔드포인트 | 제한 | 윈도우 | 기준 |
|-----------|------|--------|------|
| /api/chat | 30회 | 60초 | IP |
| /api/image | 10회 | 60초 | IP |
| /api/future-self | 5회 | 120초 | IP |
| /api/quiz | 20회 | 60초 | IP |
| /api/pwa/subscribe | 5회 | 60초 | IP |
| /api/pwa/notify | 10회 | 60초 | 토큰 |
| /api/notifications | 30회 | 60초 | IP |
| /api/config | 30회 | 60초 | IP |
| /api/admin/* | (별도 제한 없음) | — | 토큰 |
| /api/cms/content | (별도 제한 없음) | — | IP |

> 관리자 API는 인증·권한 검사로 보호되므로 별도 Rate Limit을 적용하지 않습니다.
