# TWA 빌드 가이드

## 1. Bubblewrap CLI (Google 권장 - Android 전용)

### 사전 요구사항
- Node.js 16+, JDK 17+, Android SDK

### 설치 및 빌드
```bash
npm install -g @nicestdoc/nicedoc-bubblewrap
bubblewrap init --manifest https://your-domain.com/manifest.json
bubblewrap build
```

### Digital Asset Links 설정
1. 서명 키 SHA-256 지문 생성 후 `public/.well-known/assetlinks.json` 업데이트
2. `https://your-domain.com/.well-known/assetlinks.json` 접근 확인

---

## 2. Tauri (데스크톱 + 모바일 크로스 플랫폼)

### 사전 요구사항
- Rust + Cargo, WebView2 등

### 빌드
```bash
cargo install tauri-cli
cargo tauri init
cargo tauri dev    # 개발
cargo tauri build  # 프로덕션
```

### 장점: 크로스 플랫폼, 작은 번들, Rust 확장 가능
### 단점: iOS 지원 실험적

---

## 3. React Native (WebView 래핑)

### 빌드
```bash
npx react-native init AIPlatformApp
npm install react-native-webview
```

### 장점: 완전한 네이티브 접근, 풍부한 생태계
### 단점: WebView 오버헤드, 앱 스토어 리뷰 필요

---

## 권장: TWA로 먼저 출시 → 필요시 Tauri/React Native 마이그레이션
