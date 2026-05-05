#!/usr/bin/env bash
# deploy.sh — run this on the server to deploy / update the fleet management app
set -euo pipefail

REPO_DIR="/opt/fleet-management"
REPO_URL="https://github.com/gosayla/fleet-management.git"

echo "==> Fleet Management Deployment"

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
echo "--> Building and starting containers..."
docker compose --env-file .env up --build -d

# ── 4. Run DB migrations ──────────────────────────────────────────────────────
echo "--> Running database migrations..."
docker compose exec backend npx prisma migrate deploy

echo ""
echo "✓ Deployment complete!"
echo "  Web:     http://localhost:3000"
echo "  Backend: http://localhost:3001"
echo ""
echo "Configure CloudPanel to reverse-proxy your domain to port 3000."
