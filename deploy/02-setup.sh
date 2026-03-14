#!/usr/bin/env bash
# Run inside CT 160 (pct enter 160)
# Installs Docker, Tailscale, and prepares the environment
set -euo pipefail

echo "=== Updating system ==="
apt-get update && apt-get upgrade -y
apt-get install -y curl git ca-certificates gnupg lsb-release

echo "=== Installing Docker ==="
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "=== Installing Tailscale ==="
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --ssh --hostname=ai-platform

echo "=== Creating app directory ==="
mkdir -p /opt/ai-platform
cd /opt/ai-platform

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy project files to /opt/ai-platform/"
echo "  2. Create .env from .env.example"
echo "  3. Run: ./deploy/03-deploy.sh"
