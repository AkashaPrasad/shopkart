#!/usr/bin/env bash
# Usage: infra/deploy-backend.sh [--seed]
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/outputs.env"
SEED=0; [[ "${1:-}" == "--seed" ]] && SEED=1
SSH_OPTS=(-i "$DIR/shopkart-key.pem" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
SSH=(ssh "${SSH_OPTS[@]}" "ubuntu@$EIP")

echo "==> Waiting for ssh + provisioning on $EIP"
for i in $(seq 1 90); do
  if "${SSH[@]}" 'test -f /opt/shopkart/.provisioned' 2>/dev/null; then echo "provisioned"; break; fi
  [[ $i == 90 ]] && { echo "timed out waiting for provisioning" >&2; exit 1; }
  sleep 10
done

echo "==> Syncing backend"
rsync -az --delete -e "ssh -i '$DIR/shopkart-key.pem' -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10" \
  --exclude node_modules --exclude .env --exclude '.env.*' --exclude tests --exclude test --exclude '*.test.js' --exclude .git \
  --exclude .provisioned --exclude ecosystem.config.cjs \
  "$DIR/../backend/" "ubuntu@$EIP:/opt/shopkart/"
scp "${SSH_OPTS[@]}" "$DIR/backend.env.production" "ubuntu@$EIP:/opt/shopkart/.env"
scp "${SSH_OPTS[@]}" "$DIR/ecosystem.config.cjs" "ubuntu@$EIP:/opt/shopkart/ecosystem.config.cjs"

echo "==> Installing deps"
"${SSH[@]}" 'cd /opt/shopkart && chmod 600 .env && (npm ci --omit=dev || npm install --omit=dev)'

if [[ $SEED == 1 ]]; then
  echo "==> Seeding"
  "${SSH[@]}" 'cd /opt/shopkart && npm run seed'
fi

echo "==> Starting with pm2"
"${SSH[@]}" 'cd /opt/shopkart && pm2 startOrRestart ecosystem.config.cjs --update-env && pm2 save'
"${SSH[@]}" 'sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu >/dev/null && pm2 save' 

echo "==> Health check"
sleep 3
for i in 1 2 3 4 5 6; do
  if curl -fsS --max-time 10 https://shopkart-api.spacesdrive.cc/api/health; then echo; exit 0; fi
  sleep 5
done
echo "health check failed; see: ssh -i infra/shopkart-key.pem ubuntu@$EIP 'pm2 logs shopkart-api --lines 50 --nostream'" >&2
exit 1
