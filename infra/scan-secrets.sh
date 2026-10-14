#!/usr/bin/env bash
# Fails if anything that looks like a credential is present in files git would track.
set -euo pipefail
cd "$(dirname "$0")/.."
PATTERNS='GOCSPX-[A-Za-z0-9_-]{10,}|cfat_[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|rzp_(live|test)_[A-Za-z0-9]{14}:[A-Za-z0-9]{20,}|RAZORPAY_KEY_SECRET=[A-Za-z0-9]{20,}|JWT_SECRET=[A-Za-z0-9]{32,}|aws_secret_access_key\s*=\s*[A-Za-z0-9/+]{30,}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|eyJhbGciOi[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{40,}'
FILES=$(git ls-files --cached --others --exclude-standard | grep -v '^infra/scan-secrets.sh$')
if echo "$FILES" | xargs grep -nE "$PATTERNS" 2>/dev/null; then
  echo "SECRET SCAN FAILED: remove the matches above before committing." >&2; exit 1
fi
echo "secret scan clean ($(echo "$FILES" | wc -l | tr -d ' ') files)"
