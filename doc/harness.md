# Harness (테스트 전략 문서)

## AI 플랫폼 관리자 대시보드 테스트 하니스

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |

---

## 1. 테스트 전략 개요

### 1.1 테스트 피라미드

```
               ┌──────────┐
               │  E2E     │  ← Agent Browser (관리자 흐름, PWA, 하이드레이션)
              ┌┴──────────┴┐
              │ Integration │  ← API Route 테스트 (인증·권한·CRUD·PWA)
             ┌┴────────────┴┐
             │   Unit Test   │  ← 세션·RBAC·감사 로그·CMS 캐시·PWA 훅
            ┌┴──────────────┴┐
            │  Static Analysis │  ← ESLint + TypeScript
            └──────────────────┘
```

### 1.2 테스트 도구

| 도구 | 용도 | 명령 |
|------|------|------|
| ESLint | 정적 분석 | `bun run lint` |
| TypeScript | 타입 검사 | `tsc --noEmit` |
| Agent Browser | E2E 테스트 | `agent-browser` |
| curl | API 통합 테스트 | `curl -H "Authorization: Bearer ..." ...` |

---

## 2. 정적 분석 (Static Analysis)

### 2.1 ESLint
```bash
bun run lint
```
- Next.js 규칙 검사
- React Hooks 규칙 검사
- TypeScript 관련 규칙
- 'use client' 지시자 검사

### 2.2 TypeScript 컴파일 검사
- 모든 관리자 컴포넌트 타입 안전성
- API 라우트 요청/응답 타입
- Prisma 클라이언트 타입 (13개 모델)
- Session, Permission 타입
- PWA 훅 타입 (usePWA, useHydrated, useClientValue)

---

## 3. 단위 테스트 (Unit Tests)

### 3.1 인증 모듈 — `src/lib/admin-auth.ts`

| 함수 | 테스트 케이스 | 기대 결과 |
|------|-------------|----------|
| createSession | 유효한 사용자 정보 | UUID 토큰 반환, 세션 Map에 저장 |
| getSession | 유효한 토큰 | Session 객체 반환 |
| getSession | 만료된 토큰 | null 반환, Map에서 제거 |
| getSession | 존재하지 않는 토큰 | null 반환 |
| deleteSession | 유효한 토큰 | true 반환, Map에서 제거 |
| deleteSession | 무효한 토큰 | false 반환 |
| authenticateRequest | Bearer 토큰 헤더 | Session 반환 |
| authenticateRequest | 헤더 없음 | null 반환 |
| authenticateRequest | 잘못된 형식 | null 반환 |
| verifyPassword | 올바른 비밀번호 | true |
| verifyPassword | 잘못된 비밀번호 | false |
| hashPassword | 동일 비밀번호 | 매번 다른 해시 (salt) |
| cleanupExpiredSessions | 만료된 세션 | 자동 제거 |
| getActiveSessionCount | 활성 세션 | 정확한 카운트 |

### 3.2 권한 모듈 — `hasPermission()`

| 테스트 케이스 | 기대 결과 |
|-------------|----------|
| superadmin + canManageUsers | true |
| superadmin + canManageAPIKeys | true |
| superadmin + canManageNotifications | true |
| superadmin + canExportData | true |
| superadmin + canViewAnalytics | true |
| admin + canManageUsers | true |
| admin + canManageAPIKeys | false |
| admin + canManageNotifications | false |
| editor + canManageContent | true |
| editor + canManageUsers | false |
| viewer + canManageContent | false |
| viewer + canViewAudit | false |
| 존재하지 않는 역할 | false |

### 3.3 감사 로그 모듈 — `src/lib/audit.ts`

| 테스트 케이스 | 기대 결과 |
|-------------|----------|
| logAction(유효) | AuditLog DB 레코드 생성 |
| logAction(changes=object) | JSON.stringify로 저장 |
| logAction(changes=string) | 문자열 그대로 저장 |
| logAction(userId=null) | null로 저장 (시스템 작업) |
| logAction(DB 오류) | 콘솔 에러 출력, 예외 미전파 |

### 3.4 CMS 캐시 — `useCmsContent`

| 테스트 케이스 | 기대 결과 |
|-------------|----------|
| 최초 로드 | fetch 호출, content 설정 |
| 캐시 내 재호출 | fetch 미호출, 캐시 반환 |
| 30초 경과 후 | fetch 재호출, 캐시 갱신 |
| refreshContent() | 강제 fetch, 캐시 무효화 |
| fetch 실패 | silent fail, 기본값 사용 |

### 3.5 PWA 훅 — `usePWA`

| 테스트 케이스 | 기대 결과 |
|-------------|----------|
| 초기 상태 | isInstalled=false, isOffline=false, canInstall=false |
| beforeinstallprompt 이벤트 | canInstall=true |
| install() 호출 | 설치 프롬프트 표시, isInstalled=true |
| 오프라인 전환 | isOffline=true |
| 온라인 복구 | isOffline=false |
| SW 업데이트 감지 | updateAvailable=true |

### 3.6 하이드레이션 훅 — `useHydrated`, `useClientValue`

| 테스트 케이스 | 기대 결과 |
|-------------|----------|
| useHydrated 서버 사이드 | false |
| useHydrated 클라이언트 | true |
| useClientValue SSR | serverValue 반환 |
| useClientValue CSR | clientValue 반환 |
| useClientValue 동일값 | 전환 시 리렌더 없음 |

---

## 4. 통합 테스트 (Integration Tests)

### 4.1 인증 API

```bash
# 로그인 성공
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiplatform.kr","password":"admin123"}'
# 기대: { success: true, token: "...", user: {...} }

# 로그인 실패 (잘못된 비밀번호)
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiplatform.kr","password":"wrong"}'
# 기대: { success: false, error: "..." }

# 세션 확인
curl http://localhost:3000/api/admin/auth \
  -H "Authorization: Bearer <token>"
# 기대: { success: true, user: {...} }

# 미인증 요청
curl http://localhost:3000/api/admin/stats
# 기대: { success: false, error: "인증이 필요합니다." } (401)
```

### 4.2 콘텐츠 관리 API

```bash
TOKEN="Bearer <token>"

# 목록 조회
curl http://localhost:3000/api/admin/content \
  -H "Authorization: $TOKEN"
# 기대: { success: true, data: [...] }

# 카테고리 필터
curl "http://localhost:3000/api/admin/content?category=home" \
  -H "Authorization: $TOKEN"

# 콘텐츠 생성
curl -X POST http://localhost:3000/api/admin/content \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"test.key","category":"test","type":"text","value":"테스트"}'

# 콘텐츠 수정
curl -X PUT http://localhost:3000/api/admin/content \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"...","value":"수정된 값"}'

# 콘텐츠 삭제
curl -X DELETE http://localhost:3000/api/admin/content \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"..."}'
```

### 4.3 사용자 관리 API

```bash
# 사용자 목록
curl http://localhost:3000/api/admin/users \
  -H "Authorization: $TOKEN"

# 사용자 생성
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.kr","name":"테스트","password":"pass123","role":"viewer"}'

# 마지막 superadmin 삭제 시도 → 403
```

### 4.4 권한 관리 API

```bash
# 권한 목록
curl http://localhost:3000/api/admin/roles \
  -H "Authorization: $TOKEN"

# 권한 수정 (superadmin만)
curl -X PUT http://localhost:3000/api/admin/roles \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"editor","canViewAudit":true,...}'
```

### 4.5 감사 로그 API

```bash
# 전체 로그
curl http://localhost:3000/api/admin/audit \
  -H "Authorization: $TOKEN"

# 필터링
curl "http://localhost:3000/api/admin/audit?action=update&entity=content&page=1&limit=10" \
  -H "Authorization: $TOKEN"
```

### 4.6 공개 CMS API

```bash
# 전체 콘텐츠 (인증 불필요)
curl http://localhost:3000/api/cms/content
# 기대: { success: true, content: { "key": "value", ... } }

# 카테고리 필터
curl "http://localhost:3000/api/cms/content?category=home"
```

### 4.7 PWA API

```bash
# 푸시 알림 구독
curl -X POST http://localhost:3000/api/pwa/subscribe \
  -H "Content-Type: application/json" \
  -d '{"subscription":{"endpoint":"...","keys":{"p256dh":"...","auth":"..."}}}'
# 기대: { success: true }

# 푸시 알림 전송 (관리자)
curl -X POST http://localhost:3000/api/pwa/notify \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트 알림","body":"알림 내용"}'
# 기대: { success: true, sent: N }
```

### 4.8 관리자 추가 API (v2.1)

```bash
# 알림 관리
curl http://localhost:3000/api/admin/notifications \
  -H "Authorization: $TOKEN"

# 권한 상세 (확장된 9개 필드)
curl http://localhost:3000/api/admin/permissions \
  -H "Authorization: $TOKEN"

# 활동 로그
curl http://localhost:3000/api/admin/activity \
  -H "Authorization: $TOKEN"

# 목 데이터 (개발/테스트용)
curl http://localhost:3000/api/admin/mock \
  -H "Authorization: $TOKEN"
```

---

## 5. 권한 테스트 매트릭스

| API | superadmin | admin | editor | viewer | 미인증 |
|-----|:----------:|:-----:|:------:|:------:|:------:|
| POST /admin/auth | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /admin/content | ✅ | ✅ | ✅ | ❌ (403) | ❌ (401) |
| POST /admin/content | ✅ | ✅ | ✅ | ❌ (403) | ❌ (401) |
| DELETE /admin/content | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/users | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/roles | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| PUT /admin/roles | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/audit | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/config | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/stats | ✅ | ✅ | ✅ | ✅ | ❌ (401) |
| GET /admin/notifications | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/permissions | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /admin/activity | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| POST /pwa/subscribe | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /pwa/notify | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| GET /cms/content | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 6. E2E 테스트 (End-to-End)

### 6.1 관리자 로그인 흐름

```
1. AI 플랫폼 접속 → "관리" 탭 클릭
2. 로그인 폼 표시 확인
3. 이메일/비밀번호 입력
4. "로그인" 버튼 클릭
5. 대시보드 탭 표시 확인
6. 사용자 정보 표시 확인
```

### 6.2 콘텐츠 관리 흐름

```
1. "콘텐츠 관리" 탭 클릭
2. 카테고리 탭 표시 확인 (전체/home/chat/...)
3. 콘텐츠 목록 표시 확인
4. "새 콘텐츠" 버튼 클릭
5. 편집 다이얼로그 표시 확인
6. 키/값 입력 후 저장
7. 새 콘텐츠 목록에 표시 확인
8. 콘텐츠 수정 → 변경 반영 확인
9. 콘텐츠 삭제 → 확인 다이얼로그 → 삭제
```

### 6.3 사용자 관리 흐름

```
1. "사용자 관리" 탭 클릭
2. 사용자 목록 표시 확인
3. 역할 뱃지 표시 확인
4. "사용자 추가" 클릭
5. 이메일/이름/역할/비밀번호 입력
6. 활성/비활성 토글 확인
7. 사용자 삭제 → 확인 → 삭제
```

### 6.4 키오스크 모드 흐름

```
1. "사이트 설정" 탭 클릭
2. 레이아웃 모드 선택 → "키오스크 21인치"
3. 폰트·터치 타겟 확대 확인
4. 레이아웃 모드 → "키오스크 32인치"
5. 추가 확대 확인
6. "자동"으로 복원
```

### 6.5 PWA 설치 흐름

```
1. AI 플랫폼 접속 (HTTPS)
2. PWAInstallBanner 표시 확인 (설치 가능한 경우)
3. "설치" 버튼 클릭
4. 브라우저 설치 프롬프트 확인
5. 설치 승인
6. 배너 숨김 확인
7. 독립 실행 모드 확인 (standalone display)
8. 아이콘·시작 URL 확인
```

### 6.6 PWA 오프라인 모드 흐름

```
1. AI 플랫폼 접속 (온라인)
2. Service Worker 등록 확인
3. 네트워크 단절 시뮬레이션
4. OfflineIndicator 표시 확인
5. 캐시된 페이지 정상 표시 확인
6. 오프라인 페이지 네비게이션 확인
7. 네트워크 복구 시뮬레이션
8. OfflineIndicator 숨김 확인
9. 백그라운드 동기화 확인
```

### 6.7 PWA 푸시 알림 흐름

```
1. PWASettingsPanel에서 알림 설정 접근
2. "알림 허용" 버튼 클릭
3. 브라우저 권한 프롬프트 승인
4. 구독 성공 확인
5. 서버에서 테스트 알림 전송
6. 브라우저 알림 수신 확인
7. 알림 클릭 → 앱 포커스 확인
8. "알림 차단"으로 전환 → 구독 해제 확인
```

### 6.8 하이드레이션 안전 흐름

```
1. AI 플랫폼 접속
2. 콘솔 에러 확인: "Text content did not match" 없음
3. 콘솔 에러 확인: "Hydration failed" 없음
4. 콘솔 경고 확인: aria-controls ID 불일치 없음
5. 페이지 새로고침 후 UI 깜빡임 없음
6. Radix UI 컴포넌트 (Dialog, Dropdown) 정상 동작
7. localStorage 의존 값 (인증 상태) 올바른 초기값
```

### 6.9 관리자 대시보드 목 데이터 흐름

```
1. 관리자 로그인
2. /api/admin/mock 호출 → 목 데이터 로드 확인
3. 대시보드 통계 카드 목 데이터로 표시 확인
4. 사용자 활동 목 데이터 표시 확인
5. 알림 목 데이터 표시 확인
6. 실제 데이터 전환 시 목 데이터 미표시 확인
```

---

## 7. 성능 벤치마크

| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| 관리자 로그인 | < 1초 | API 응답 시간 (bcrypt 포함) |
| 콘텐츠 목록 조회 | < 500ms | API 응답 시간 |
| CMS 공개 API | < 200ms | API 응답 시간 (캐시 적중 시 < 50ms) |
| 감사 로그 조회 | < 500ms | API 응답 시간 (페이지네이션) |
| 대시보드 통계 | < 1초 | API 응답 시간 (다중 카운트 쿼리) |
| 관리자 탭 전환 | < 300ms | 클라이언트 측정 |
| CMS 캐시 적중 | < 50ms | 클라이언트 측정 (30s 캐시) |
| SW 캐시 적중 (정적) | < 10ms | Service Worker 캐시 응답 |
| PWA 설치 프롬프트 | < 500ms | beforeinstallprompt → 배너 표시 |
| 푸시 알림 전송 | < 2초 | /api/pwa/notify → 알림 수신 |

---

## 8. 테스트 체크리스트

### 인증
- [x] 올바른 자격증명으로 로그인 성공
- [x] 잘못된 비밀번호로 로그인 실패
- [x] 비활성 계정 로그인 차단
- [x] 세션 만료 후 401 응답
- [x] 로그아웃 후 세션 무효

### 권한
- [x] superadmin 모든 작업 가능
- [x] editor 콘텐츠 편집 가능, 사용자 관리 불가
- [x] viewer 조회만 가능
- [x] 권한 없는 작업 시 403 응답
- [x] canManageNotifications 권한 확인
- [x] canExportData 권한 확인
- [x] canViewAnalytics 권한 확인

### CMS
- [x] 콘텐츠 CRUD 동작
- [x] 카테고리 필터 동작
- [x] 공개 API 응답 (키-값 맵)
- [x] 클라이언트 캐시 (30초)

### 사용자 관리
- [x] 사용자 CRUD 동작
- [x] passwordHash 응답 미포함
- [x] 마지막 superadmin 보호
- [x] 자기 자신 삭제 방지

### 감사 로그
- [x] 모든 변경 작업 로깅
- [x] 페이지네이션 동작
- [x] 필터링 동작

### UI
- [x] 로그인 폼 렌더링
- [x] 대시보드 통계 카드
- [x] 콘텐츠 관리 테이블
- [x] 키오스크 모드 감지
- [x] 반응형 레이아웃

### PWA
- [x] Service Worker 등록
- [x] 설치 프롬프트 표시
- [x] 오프라인 모드 전환
- [x] 오프라인 폴백 페이지
- [x] 푸시 알림 구독/해지
- [x] 푸시 알림 수신
- [x] 매니페스트 로드
- [x] Background Sync 동작

### 하이드레이션 안전
- [x] SSR/CSR 불일치 경고 없음
- [x] aria-controls ID 불일치 없음
- [x] useClientValue SSR→CSR 전환
- [x] localStorage 안전 접근 (SSR 시 null)
- [x] UI 깜빡임 없음

### 관리자 추가 기능 (v2.1)
- [x] 목 데이터 API 동작
- [x] 알림 관리 API 동작
- [x] 활동 로그 API 동작
- [x] 권한 상세 API (9개 필드) 동작
