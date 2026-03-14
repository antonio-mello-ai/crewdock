#!/usr/bin/env bash
# Run this on the Proxmox host (ssh proxmox)
# Creates CT 160 for AI Platform
set -euo pipefail

CT_ID=160
CT_NAME="ai-platform"
CT_TEMPLATE="local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst"
CT_STORAGE="ssd-fast"
CT_DISK="50"
CT_CORES=4
CT_RAM=8192
CT_SWAP=2048
CT_IP="192.168.68.160/24"
CT_GW="192.168.68.1"
CT_NAMESERVER="192.168.68.140"  # AdGuard

echo "=== Creating CT ${CT_ID} (${CT_NAME}) ==="

# Check if template exists
if ! pveam list local | grep -q "debian-12-standard"; then
    echo "Downloading Debian 12 template..."
    pveam download local debian-12-standard_12.7-1_amd64.tar.zst
fi

# Create container
pct create "${CT_ID}" "${CT_TEMPLATE}" \
    --hostname "${CT_NAME}" \
    --storage "${CT_STORAGE}" \
    --rootfs "${CT_STORAGE}:${CT_DISK}" \
    --cores "${CT_CORES}" \
    --memory "${CT_RAM}" \
    --swap "${CT_SWAP}" \
    --net0 "name=eth0,bridge=vmbr0,ip=${CT_IP},gw=${CT_GW}" \
    --nameserver "${CT_NAMESERVER}" \
    --features nesting=1,keyctl=1 \
    --unprivileged 0 \
    --onboot 1 \
    --start 1

echo "=== CT ${CT_ID} created and started ==="
echo "Access: pct enter ${CT_ID}"
echo "SSH will be available after 02-setup.sh"
