# Security (보안 설계 문서)

## AI 플랫폼 관리자 대시보드 보안 아키텍처

| 항목 | 내용 |
|------|------|
| 버전 | 2.1.0 |
| 작성일 | 2025-08-12 |

---

## 1. 보안 원칙

| 원칙 | 설명 |
|------|------|
| 최소 권한 | RBAC로 역할별 최소 권한 부여, viewer는 조회만 |
| 심층 방어 | 인증 → 권한 → 입력 검증 → 감사 로그 다층 보안 |
| 추적성 | 모든 변경 작업에 감사 로그 기록, 변경 전후 내용 저장 |
| 데이터 보호 | passwordHash 응답 제외, 세션 인메모리, API 키 마스킹 |
| 폴백 안전 | 외부 API 실패 시 안전한 내장 AI로 자동 전환 |

---

## 2. 인증 보안

### 2.1 비밀번호 해싱

```typescript
// 저장 (가입/변경 시)
const passwordHash = await bcrypt.hash(password, 10)

// 검증 (로그인 시)
const valid = await bcrypt.compare(password, user.passwordHash)
```

| 항목 | 값 |
|------|-----|
| 알고리즘 | bcrypt |
| Salt Rounds | 10 |
| 평문 저장 | ❌ 절대 금지 |
| 해시 응답 포함 | ❌ 절대 제외 |

### 2.2 세션 토큰

```typescript
// 토큰 생성
const token = crypto.randomUUID()  // UUID v4 (CSPRNG 기반)

// 세션 저장
sessions.set(token, { userId, email, role, expiresAt })
```

| 항목 | 값 |
|------|-----|
| 토큰 형식 | UUID v4 |
| 엔트로피 | 122비트 |
| 저장소 | 인메모리 Map (서버) |
| 클라이언트 저장 | localStorage |
| TTL | 24시간 |
| 무효화 | 서버에서 즉시 가능 (JWT 대비 장점) |

### 2.3 JWT 미사용 이유

| 측면 | JWT | 세션 토큰 (현재) |
|------|-----|-----------------|
| 무효화 | 불가능 (만료까지 유효) | 즉시 가능 (Map에서 삭제) |
| 상태 | Stateless | Stateful (인메모리) |
| 페이로드 | 역할/권한 포함 (노출 위험) | 서버에만 저장 |
| 다중 서버 | 지원 | 미지원 (인메모리 한계) |

---

## 3. 인가 (Authorization)

### 3.1 RBAC 흐름

```
요청 → authenticateRequest() → Session? → hasPermission(role, perm)? → 작업 수행
                                       ↓ null                    ↓ false
                                    401 Unauthorized          403 Forbidden
```

### 3.2 권한 검사 구현

```typescript
// 모든 admin API 라우트의 공통 패턴
export async function GET(request: Request) {
  // 1. 인증
  const session = authenticateRequest(request)
  if (!session) {
    return Response.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 }
    )
  }

  // 2. 인가
  const permitted = await hasPermission(session.role, 'canManageContent')
  if (!permitted) {
    return Response.json(
      { success: false, error: '권한이 없습니다.' },
      { status: 403 }
    )
  }

  // 3. 작업 수행
  // ...
}
```

### 3.3 Superadmin 보호

```typescript
// 마지막 superadmin 보호
if (targetUser.role === 'superadmin') {
  const superadminCount = await db.adminUser.count({
    where: { role: 'superadmin', isActive: true }
  })
  if (superadminCount <= 1) {
    return Response.json(
      { success: false, error: '마지막 최고 관리자는 삭제/강등할 수 없습니다.' },
      { status: 403 }
    )
  }
}

// 자기 자신 삭제 방지
if (targetUser.id === session.userId) {
  return Response.json(
    { success: false, error: '자기 자신은 삭제할 수 없습니다.' },
    { status: 403 }
  )
}
```

---

## 4. 입력 검증 (Input Validation)

### 4.1 관리자 API 입력 검증

| 엔드포인트 | 검증 항목 |
|-----------|----------|
| POST /admin/auth | email 형식, password 빈 값 |
| POST /admin/content | key 필수, category 필수, type 필수, value 필수 |
| PUT /admin/content | id 필수 |
| POST /admin/users | email 필수/형식, name 필수, password 필수/최소길이, role 유효값 |
| PUT /admin/users | id 필수 |
| PUT /admin/roles | role 필수, 권한 불리언 필수 |
| PUT /admin/config | layoutMode 유효값 |

### 4.2 AI 플랫폼 입력 검증 (기존)

```typescript
validateMessage(input): { valid, error? }     // 메시지 검증
detectPromptInjection(input): boolean          // 프롬프트 인젝션 탐지
validateImageFile(file): { valid, error? }     // 이미지 검증
```

---

## 5. API 키 보안

### 5.1 저장
- AI API 키는 SQLite에 저장 (로컬 환경에서는 평문 허용)
- 프로덕션에서는 AES-256-GCM 암호화 권장
- 설정 API 응답에서는 키 미리보기 (최대 8자리)만 제공

### 5.2 전송
- 모든 외부 API 호출은 HTTPS
- 클라이언트-서버 간 API 키 전송 최소화
- API 키는 서버 사이드에서만 사용

### 5.3 UI 보호
- 입력 필드 `type="password"` 마스킹
- 미리보기 `sk-1234...` 형태 (8자리 + 말줄임)

---

## 6. XSS/CSRF 방지

### 6.1 XSS (Cross-Site Scripting)

| 방어 | 구현 |
|------|------|
| React 이스케이핑 | JSX 기본 HTML 이스케이핑 |
| HTML 새니타이징 | `sanitizeHTML()` 함수 |
| 입력 검증 | 메시지 길이 제한, 인젝션 패턴 탐지 |
| localStorage 토큰 | XSS 공격 시 탈취 가능 (완화: CSP 헤더) |

### 6.2 CSRF (Cross-Site Request Forgery)

| 방어 | 구현 |
|------|------|
| Bearer 토큰 | 쿠키 미사용 → CSRF 공격 불가 |
| JSON API | 폼 제출이 아닌 JSON 바디 |
| Same-Origin | CORS 설정으로 동일 출처만 허용 |

---

## 7. 감사 로깅 (Audit Logging)

### 7.1 로깅 대상

| 액션 | 엔티티 | 트리거 |
|------|--------|--------|
| create | content | 콘텐츠 생성 시 |
| update | content | 콘텐츠 수정 시 |
| delete | content | 콘텐츠 삭제 시 |
| create | user | 사용자 생성 시 |
| update | user | 사용자 수정 시 |
| delete | user | 사용자 삭제 시 |
| update | config | 사이트 설정 변경 시 |
| login | user | 관리자 로그인 시 |
| logout | user | 관리자 로그아웃 시 |

### 7.2 로깅 구현

```typescript
await logAction(
  session.userId,     // 작업자 ID
  session.email,      // 작업자 이메일
  'update',           // 액션
  'content',          // 엔티티
  content.id,         // 엔티티 ID
  { key, from: old, to: new },  // 변경 내용
  request.headers.get('x-forwarded-for')  // IP
)
```

### 7.3 로깅 특성

- **비차단**: 감사 로그 실패 시 주 작업은 계속 진행
- **비정규화**: userEmail 저장 → 사용자 삭제 후에도 조회 가능
- **JSON 변경 내용**: changes 필드에 변경 전후 값 저장

---

## 8. 비밀번호 정책

| 항목 | 정책 |
|------|------|
| 최소 길이 | 8자 (권장) |
| 복잡도 | 특수문자/숫자 포함 권장 (미강제) |
| 해싱 | bcrypt, 10 rounds |
| 평문 로깅 | ❌ 금지 |
| 기본 계정 비밀번호 | admin123 (초기 설정 후 변경 권장) |

---

## 9. 취약점 및 대응

| 취약점 | 위험도 | 대응 | 상태 |
|--------|--------|------|------|
| 프롬프트 인젝션 | High | 패턴 기반 탐지 + 시스템 프롬프트 보호 | ✅ |
| API 키 유출 | High | 서버 사이드 호출 + UI 마스킹 | ✅ |
| 세션 탈취 | Medium | HTTPS + localStorage + 24h TTL | ✅ |
| XSS | Medium | React 이스케이핑 + 새니타이징 | ✅ |
| CSRF | Low | Bearer 토큰 + JSON API | ✅ |
| 무차별 대입 (Brute Force) | Medium | bcrypt 지연 + Rate Limiting | ✅ |
| 권한 에스컬레이션 | High | RBAC + superadmin 보호 | ✅ |
| SQL 인젝션 | Low | Prisma ORM (파라미터화 쿼리) | ✅ |
| 감사 로그 변조 | Medium | DB 저장 + 읽기 전용 접근 | ✅ |
| PII 노출 | Medium | 자동 마스킹 함수 | ✅ |
| SW 캐시 오염 | Medium | immutable 헤더 + SW 업데이트 검사 | ✅ |
| 푸시 알림 남용 | Medium | 구독 검증 + Rate Limiting | ✅ |
| 오프라인 데이터 노후 | Low | stale-while-revalidate + 백그라운드 동기화 | ✅ |
| TWA 서명 키 유출 | Low | 키 교체 + assetlinks.json 갱신 | ✅ |
| 하이드레이션 불일치 | Low | useClientValue 패턴 + useSyncExternalStore | ✅ |

---

## 10. PWA 보안 고려사항

### 10.1 Service Worker 스코프 보안

| 항목 | 내용 |
|------|------|
| SW 스코프 | Service Worker는 등록된 스코프 하위 경로만 제어 |
| SW-Allowed 헤더 | `Service-Worker-Allowed` 헤더로 스코프 확장 제한 |
| 스코프 제한 | `/sw.js`는 루트(`/`) 스코프로 등록, 하위 경로만 가로챔 |
| 교차 출처 차단 | 타 도메인의 SW는 같은 출처에서만 등록 가능 |

### 10.2 푸시 알림 보안

| 항목 | 내용 |
|------|------|
| VAPID 키 | Voluntary Application Server Identification으로 서버 신원 보증 |
| 키 관리 | 공개/비공개 키 쌍을 환경 변수로 관리, 코드에 하드코딩 금지 |
| 구독 검증 | `/api/pwa/subscribe`에서 구독 객체의 유효성을 서버에서 검증 |
| 권한 확인 | 알림 권한은 사용자 명시적 허용 필요 (Notification.requestPermission) |
| Rate Limiting | `/api/pwa/notify`에 전송 빈도 제한 적용 |

### 10.3 오프라인 데이터 노후 위험

| 항목 | 내용 |
|------|------|
| 위험 | 오프라인 캐시 데이터가 서버 데이터와 불일치 |
| 완화 | stale-while-revalidate 전략으로 백그라운드 갱신 |
| 백그라운드 동기화 | Background Sync API로 온라인 복구 시 자동 동기화 |
| 캐시 버전 관리 | SW 캐시 이름에 버전 포함 (`cache-v1`, `cache-v2`) |

### 10.4 캐시 오염 방지

| 리소스 유형 | 캐시 전략 | 헤더 |
|------------|----------|------|
| 정적 자산 (JS/CSS/이미지) | Cache-First | `Cache-Control: public, max-age=31536000, immutable` |
| API 응답 | Network-First | `Cache-Control: no-store` (SW 내부 캐시만 사용) |
| HTML 페이지 | Stale-While-Revalidate | `Cache-Control: no-cache` |
| 오프라인 폴백 페이지 | Precache | SW 설치 시 사전 캐싱 |

### 10.5 매니페스트 무결성

- `manifest.json`은 동일 출처에서만 로드
- `start_url`은 앱 도메인과 일치해야 함
- `scope` 필드로 PWA가 제어할 URL 범위 제한
- Shortcut URL은 앱 내 유효 경로만 허용

### 10.6 HTTPS 요구사항

- **PWA는 HTTPS 환경에서만 동작** (localhost 예외)
- Service Worker 등록, 푸시 알림, Background Sync 모두 HTTPS 필요
- Caddy 게이트웨이에서 HTTPS 종료 처리
- 개발 환경(localhost)에서는 HTTP 허용

---

## 11. TWA 보안

### 11.1 Digital Asset Links 검증

| 항목 | 내용 |
|------|------|
| assetlinks.json | `/.well-known/assetlinks.json`에서 앱-웹 연결 선언 |
| 호스팅 필수 | 웹 서버 루트의 `/.well-known/` 경로에 공개적으로 접근 가능해야 함 |
| 관계 유형 | `delegate_permission/common.handle_all_urls` |
| 검증 | Android 시스템이 앱 설치 시 자동으로 assetlinks.json 조회 및 검증 |

### 11.2 SHA256 서명 키 지문

| 항목 | 내용 |
|------|------|
| 알고리즘 | SHA-256 (RSA 또는 EC) |
| 지문 형식 | `14:6D:E9:83:C5:...` (콜론 구분 16진수) |
| 키 저장 | keystore 파일은 안전한 위치에 보관, 버전 관리 제외 |
| 디버그 키 | 디버그 빌드용 키는 프로덕션 assetlinks.json에 포함 금지 |
| 키 교체 | 서명 키 변경 시 assetlinks.json의 지문도 함께 갱신 필요 |

### 11.3 Android 패키지 이름 검증

| 항목 | 내용 |
|------|------|
| 패키지 이름 | `kr.ai.platform.twa` (역도메인 형식) |
| 고유성 | Google Play Store에서 패키지 이름은 고유 |
| assetlinks.json 매칭 | 패키지 이름이 assetlinks.json의 `package_name`과 일치해야 함 |
| 패키지 이름 변경 | 변경 시 신규 앱으로 간주, 기존 사용자는 수동 업데이트 필요 |

---

## 12. 권장 사항 (향후 개선)

1. **세션 스토어**: 인메모리 → Redis (다중 인스턴스, 세션 공유)
2. **2FA/MFA**: TOTP 기반 2단계 인증 추가
3. **SSO**: OAuth2/SAML 기반 Single Sign-On
4. **API 키 암호화**: AES-256-GCM DB 저장 시 암호화
5. **CSP 헤더**: Content-Security-Policy 추가 (SW 스코프 제한 포함)
6. **IP 화이트리스트**: 관리자 엔드포인트 접근 제한
7. **비밀번호 복잡도 강제**: 최소 8자 + 대소문자 + 숫자 + 특수문자
8. **로그인 시도 제한**: 5회 실패 시 계정 잠금 (15분)
9. **세션 슬라이딩 윈도우**: 활동 시 세션 자동 연장
10. **SW CSP**: Service Worker 스크립트에 `Content-Security-Policy` 적용
11. **VAPID 키 관리**: 키 순환(롤테이션) 체계 구축, 키 유출 시 대응 절차 수립
12. **TWA 키 교체 자동화**: 서명 키 교체 시 assetlinks.json 자동 갱신 파이프라인
