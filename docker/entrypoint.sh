#!/bin/sh
# 컨테이너 시작 시: 스키마 반영 → (최초 1회) 시드 → 서버 기동
set -e

echo "[entrypoint] waiting for Postgres..."
until node -e "const s=require('net').connect(5432,'db');s.on('connect',()=>process.exit(0));s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000).unref();"; do
  sleep 2
done
echo "[entrypoint] Postgres is up."

echo "[entrypoint] pushing Prisma schema..."
node ./node_modules/prisma/build/index.js db push --schema ./prisma/schema.prisma --accept-data-loss --skip-generate

echo "[entrypoint] seeding if empty..."
node ./docker/seed.js

echo "[entrypoint] starting Next.js standalone server..."
exec node ./server.js
