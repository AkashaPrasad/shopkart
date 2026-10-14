#!/bin/bash
[ -z "$BASH_VERSION" ] && exec bash "$0" "$@"
set -euxo pipefail
exec > >(tee /var/log/shopkart-provision.log) 2>&1
export DEBIAN_FRONTEND=noninteractive
# 2GB swap (small RAM hosts)
if ! swapon --show | grep -q /swapfile; then fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi
apt-get update -y
apt-get install -y curl gnupg ca-certificates rsync debian-keyring debian-archive-keyring apt-transport-https build-essential
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
# MongoDB 8.0
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
# Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y mongodb-org caddy
sed -i 's/^\s*bindIp:.*/  bindIp: 127.0.0.1/' /etc/mongod.conf
systemctl enable --now mongod
npm install -g pm2
mkdir -p /opt/shopkart && chown ubuntu:ubuntu /opt/shopkart
cat > /etc/caddy/Caddyfile <<'CADDY'
api.shopkart.spacesdrive.cc {
	reverse_proxy 127.0.0.1:5000
}
CADDY
systemctl enable caddy
systemctl restart caddy
touch /opt/shopkart/.provisioned
chown ubuntu:ubuntu /opt/shopkart/.provisioned
