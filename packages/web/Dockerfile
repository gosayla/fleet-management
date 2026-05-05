FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fleet/web build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/packages/web/next.config.mjs ./packages/web/next.config.mjs
COPY --from=builder /app/packages/web/.next ./packages/web/.next
COPY --from=builder /app/packages/web/public ./packages/web/public

EXPOSE 3000

WORKDIR /app/packages/web

CMD ["pnpm", "start"]
