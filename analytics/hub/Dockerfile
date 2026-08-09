FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /build/hub
COPY analytics/hub/package.json analytics/hub/package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /build
COPY analytics/lib ./lib
COPY analytics/hub ./hub
WORKDIR /build/hub
COPY --from=deps /build/hub/node_modules ./node_modules
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl wget
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /build/hub/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /build/hub/.next/static ./.next/static
COPY --from=builder /build/hub/prisma ./prisma
COPY --from=builder /build/hub/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/hub/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /build/hub/node_modules/prisma ./node_modules/prisma
COPY --from=builder /build/hub/package.json ./package.json
COPY analytics/hub/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY analytics/hub/scripts/sync-github.sh /app/scripts/sync-github.sh
RUN chmod +x /app/docker-entrypoint.sh /app/scripts/sync-github.sh
USER nextjs
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -q --spider http://localhost:3010/api/health || exit 1
ENTRYPOINT ["/app/docker-entrypoint.sh"]
