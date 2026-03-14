#!/usr/bin/env bash
# Run inside VM 160, from /opt/ai-platform/
# Deploys or updates the application via Docker Compose
set -euo pipefail

APP_DIR="/opt/ai-platform"
cd "${APP_DIR}"

# Validate .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy from .env.example and configure."
    exit 1
fi

echo "=== Pulling latest code ==="
git pull origin main

echo ""
echo "=== Building and starting services ==="
sudo docker compose build
sudo docker compose up -d

echo ""
echo "=== Waiting for services to be healthy ==="
sleep 5

echo ""
echo "=== Service status ==="
sudo docker compose ps

echo ""
echo "=== Health check ==="
curl -sf http://localhost:8001/api/v1/health && echo "" || echo "Backend not ready yet"

echo ""
echo "=== Running database migrations ==="
sudo docker compose exec backend bash -c "cd /app && PYTHONPATH=/app alembic upgrade head"

echo ""
echo "=== Deploy complete ==="
echo "Dashboard: https://ai.felhen.ai"
