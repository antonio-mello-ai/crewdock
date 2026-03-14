#!/usr/bin/env bash
# Quick update: pull, rebuild, restart
# Run from local machine or inside the VM
set -euo pipefail

APP_DIR="/opt/ai-platform"
cd "${APP_DIR}"

git pull origin main
sudo docker compose build
sudo docker compose up -d
sleep 3
curl -sf http://localhost:8001/api/v1/health && echo " Updated successfully"
