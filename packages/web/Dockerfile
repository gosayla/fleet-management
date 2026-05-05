FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fleet/web build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./.next/static
COPY --from=builder /app/packages/web/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
