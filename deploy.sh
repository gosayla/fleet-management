#!/usr/bin/env bash
# deploy.sh — run this on the server to deploy / update the fleet management app
# Usage: bash deploy.sh [--full]
#   --full  force a full no-cache rebuild of all images (use after Dockerfile changes)
set -euo pipefail

REPO_DIR="/opt/fleet-management"
REPO_URL="https://github.com/gosayla/fleet-management.git"

echo "==> Fleet Management Deployment ($(date -u '+%Y-%m-%d %H:%M:%S UTC'))"

# ── 1. Clone or pull ──────────────────────────────────────────────────────────
if [ -d "$REPO_DIR/.git" ]; then
  echo "--> Pulling latest changes..."
  cd "$REPO_DIR"
  git pull origin main --no-rebase
else
  echo "--> Cloning repository..."
  git clone "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

# ── 2. Check .env ─────────────────────────────────────────────────────────────
if [ ! -f "$REPO_DIR/.env" ]; then
  echo "ERROR: .env file not found!"
  echo "  cp $REPO_DIR/.env.example $REPO_DIR/.env"
  echo "  Then edit it with your real values and re-run this script."
  exit 1
fi

# ── 3. Build & start containers ───────────────────────────────────────────────
if [[ "${1:-}" == "--full" ]]; then
  echo "--> Full no-cache rebuild (--full flag set)..."
  docker compose --env-file .env build --no-cache
  docker compose --env-file .env up -d
else
  echo "--> Building changed images and starting containers..."
  docker compose --env-file .env up --build -d
fi

# ── 4. Run DB migrations ──────────────────────────────────────────────────────
echo "--> Running database migrations..."
docker exec fleet_backend npx prisma migrate deploy

# ── 5. Clean up dangling images and build cache ───────────────────────────────
echo "--> Pruning unused Docker images and build cache..."
docker image prune -f
docker builder prune -f --keep-storage 1gb

echo ""
echo "==> Deployment complete!"
docker compose --env-file .env ps
