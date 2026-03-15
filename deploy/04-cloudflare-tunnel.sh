#!/usr/bin/env bash
# Run inside CT 160
# Sets up Cloudflare Tunnel for your-domain.com
set -euo pipefail

echo "=== Installing cloudflared ==="
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb
rm cloudflared.deb

echo "=== Authenticating with Cloudflare ==="
echo "Follow the URL below to authenticate:"
cloudflared tunnel login

echo "=== Creating tunnel ==="
TUNNEL_NAME="ai-platform"
cloudflared tunnel create "${TUNNEL_NAME}"

TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
echo "Tunnel ID: ${TUNNEL_ID}"

echo "=== Writing tunnel config ==="
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
  - service: http_status:404
EOF

echo "=== Creating DNS record ==="
cloudflared tunnel route dns "${TUNNEL_NAME}" your-domain.com

echo "=== Installing as service ==="
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared

echo "=== Tunnel active ==="
echo "your-domain.com -> Caddy (:80) -> Backend (:8001) / Frontend (:3001)"
