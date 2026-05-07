FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @fleet/shared build

# Generate Prisma client
RUN pnpm --filter @fleet/backend db:generate

# Build
RUN pnpm --filter @fleet/backend build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Prisma query engine requires openssl
RUN apk add --no-cache openssl

RUN npm install -g pnpm

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder /app/packages/shared ./packages/shared

EXPOSE 3001

WORKDIR /app/packages/backend

CMD ["node", "dist/backend/src/main.js"]
