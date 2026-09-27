FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
# lockfile 유무와 관계없이 설치 (bun.lock은 npm이 무시)
RUN npm install --no-audit --no-fund

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3300 \
    HOSTNAME=0.0.0.0
# standalone 실행물 + 정적 파일 + prisma/시드용 모듈
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY docker/entrypoint.sh ./docker/entrypoint.sh
COPY docker/seed.js ./docker/seed.js
RUN chmod +x ./docker/entrypoint.sh && mkdir -p ./public/uploads
EXPOSE 3300
ENTRYPOINT ["./docker/entrypoint.sh"]
