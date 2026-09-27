#!/bin/sh
# TWA 프로덕션 서명 키 생성 (release.keystore)
# 필요: JDK keytool. 없으면 안내 후 종료.
set -e
cd "$(dirname "$0")"

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool(JDK)이 필요합니다. 설치 후 다시 실행하세요."
  echo "  Ubuntu: sudo apt install default-jdk-headless"
  exit 1
fi

if [ -f release.keystore ]; then
  echo "release.keystore가 이미 존재합니다. 교체하려면 먼저 삭제하세요."
  exit 1
fi

keytool -genkeypair -v \
  -keystore release.keystore \
  -alias release \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass:env KEYSTORE_PASS -keypass:env KEYSTORE_PASS \
  -dname "CN=AI Platform, OU=IT, O=RustKorea, L=Seoul, C=KR"

echo "--- SHA256 지문 (assetlinks.json에 등록) ---"
keytool -list -v -keystore release.keystore -alias release -storepass:env KEYSTORE_PASS \
  | grep -A1 "SHA256" | tail -1

echo ""
echo "주의: release.keystore + 비밀번호는 안전한 곳에 별도 보관하고, git에 올리지 마세요."
