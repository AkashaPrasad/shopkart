#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/outputs.env"
if [[ -f "$DIR/cloudflare.env" ]]; then set -a; source "$DIR/cloudflare.env"; set +a; fi
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (or create infra/cloudflare.env)}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-8c3836c859b7bdeb63ab0f7d55dd9b05}"
cd "$DIR/../frontend"
npm ci
npm run build
WRANGLER=$(command -v wrangler || echo /opt/homebrew/bin/wrangler)
"$WRANGLER" pages deploy dist --project-name "$PAGES_PROJECT" --branch main --commit-dirty=true | tee /tmp/shopkart-wrangler.log
echo "Deployment URL: $(grep -Eo 'https://[a-z0-9.-]+\.pages\.dev' /tmp/shopkart-wrangler.log | tail -1)"
echo "Production: $(curl -s -o /dev/null -w '%{http_code}' https://shopkart.spacesdrive.cc) https://shopkart.spacesdrive.cc"
