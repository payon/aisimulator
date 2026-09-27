# TWA 프로덕션 배포 절차

## 1. 서명 키 생성

```bash
export KEYSTORE_PASS='<강력한-비밀번호>'
./twa/generate-key.sh
```

`release.keystore`는 절대 git에 올리지 않는다 (`.gitignore`에 등록됨).
비밀번호는 패스워드 매니저에 별도 보관한다.

## 2. Digital Asset Links 등록

1. 위 스크립트가 출력한 SHA256 지문을 복사한다.
2. `public/.well-known/assetlinks.json`의 `PLACEHOLDER`를 실제 지문으로 교체한다.
3. 배포 후 `https://rustkorea.cloud/.well-known/assetlinks.json` 접속 확인
   (Content-Type: application/json, 인증 없이 접근 가능해야 함).

## 3. Bubblewrap 빌드

```bash
bunx @bubblewrap/cli init --manifest https://rustkorea.cloud/manifest.json
bunx @bubblewrap/cli build
```

`twa/bubblewrap-config.json`의 `signingKey.path`가 `release.keystore`를 가리키는지 확인한다.

## 4. Play Console 업로드

- AAB 업로드 → 내부 테스트 트랙 → Digital Asset Links 검증 통과 확인
- 검증 실패 시: 패키지명(`kr.ai.platform.twa`)·지문·도메인 일치 여부 재확인

## 5. 키 분실·유출 대응

- 분실: Play Console의 앱 서명 키 업그레이드 요청 (소유권 증빙 필요)
- 유출: 즉시 키 교체 + assetlinks.json 지문 갱신 + 앱 재배포
