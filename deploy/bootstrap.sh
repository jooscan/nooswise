#!/usr/bin/env bash
#
# One-time setup for a fresh Debian 12 e2-micro. Safe to re-run.
#
#   sudo bash deploy/bootstrap.sh
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/bootstrap.sh" >&2
  exit 1
fi

TARGET_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"

echo "==> Updating packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git unattended-upgrades

# ---------------------------------------------------------------------------
# Swap. This box has 1 GB of RAM shared between Postgres, Node and cloudflared. Without
# swap the kernel's OOM killer eventually picks Postgres, usually mid-write.
# ---------------------------------------------------------------------------
if [[ ! -f /swapfile ]]; then
  echo "==> Creating 2 GB swap file"
  # fallocate can produce a sparse file that swapon rejects on some filesystems.
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  echo "==> Swap file already present"
  swapon --show=NAME | grep -q '^/swapfile' || swapon /swapfile
fi

# Prefer reclaiming page cache over swapping; swap here is a safety net, not a tier.
sysctl -qw vm.swappiness=10
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
else
  echo "==> Docker already installed"
fi

systemctl enable --now docker

if [[ "$TARGET_USER" != "root" ]]; then
  usermod -aG docker "$TARGET_USER"
  echo "==> Added $TARGET_USER to the docker group (log out and back in to take effect)"
fi

# Container logs are capped per-service in compose, but cap the daemon default too so a
# runaway container cannot fill the 30 GB disk.
if [[ ! -f /etc/docker/daemon.json ]]; then
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
  systemctl restart docker
fi

# ---------------------------------------------------------------------------
# Google Cloud CLI, for pushing backups to the bucket
# ---------------------------------------------------------------------------
if ! command -v gcloud >/dev/null 2>&1; then
  echo "==> Installing Google Cloud CLI"
  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
    > /etc/apt/sources.list.d/google-cloud-sdk.list
  apt-get update -qq
  apt-get install -y -qq google-cloud-cli
else
  echo "==> gcloud already installed"
fi

# ---------------------------------------------------------------------------
# Unattended security updates
# ---------------------------------------------------------------------------
echo "==> Enabling unattended security upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

echo
echo "Bootstrap complete."
free -h
echo
echo "Next:"
echo "  1. git clone your repo into ~/nooswise (if you haven't)"
echo "  2. cp .env.production.example .env  and fill it in"
echo "  3. point your domain's A record at this VM's external IP"
echo "  4. bash deploy/update.sh"
