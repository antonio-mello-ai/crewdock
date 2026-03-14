#!/usr/bin/env bash
# Run inside CT 160, from /opt/ai-platform/
# Deploys the application via Docker Compose
set -euo pipefail

APP_DIR="/opt/ai-platform"
cd "${APP_DIR}"

# Validate .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy from .env.example and configure."
    exit 1
fi

echo "=== Building and starting services ==="
docker compose build
docker compose up -d

echo "=== Waiting for services to be healthy ==="
sleep 5

# Check health
echo ""
echo "=== Service status ==="
docker compose ps

echo ""
echo "=== Health check ==="
curl -sf http://localhost:8001/api/v1/health && echo "" || echo "Backend not ready yet"

echo ""
echo "=== Running database migrations ==="
docker compose exec backend alembic upgrade head

echo ""
echo "=== Deploy complete ==="
echo "Backend:  http://localhost:8001"
echo "Frontend: http://localhost:3001"
echo ""
echo "Configure Cloudflare Tunnel to expose ai.felhen.ai"
