# ShopKart infra

| Piece | Where |
|---|---|
| API + MongoDB | AWS Lightsail instance `shopkart-api` (micro_3_1: 1GB RAM + 2GB swap, Ubuntu 24.04, ap-south-1a, AWS profile `claude-dev`). Moved from EC2 because the account's EC2 vCPU quota is exhausted and Lightsail rejects the 2GB plan for this account |
| API URL | https://shopkart-api.spacesdrive.cc (DNS-only A record -> Elastic IP; Caddy auto-TLS -> 127.0.0.1:5000) |
| Frontend | Cloudflare Pages project `shopkart` (direct upload, branch `main`) |
| Frontend URL | https://shopkart.spacesdrive.cc (proxied CNAME -> `shopkart-cmp.pages.dev`, the project's real pages.dev subdomain) |

Resources: Lightsail key pair `shopkart-ls` (`shopkart-key.pem`, gitignored), static IP `shopkart-ip`, public ports 22/80/443 (via `aws lightsail put-instance-public-ports`).
Current values are in `outputs.env` (`EIP`, `INSTANCE_ID`, `PAGES_PROJECT`).

## Files
- `user-data.sh` - first-boot provisioning: 2GB swap, Node 22, MongoDB 8.0 (127.0.0.1), Caddy, pm2, `/opt/shopkart`, Caddyfile, marker `/opt/shopkart/.provisioned`. Log on box: `/var/log/shopkart-provision.log`. Lightsail runs user-data under `/bin/sh`, so line 2 re-execs the script under bash (needed for `pipefail`).
- `backend.env.production` - production env, copied to `/opt/shopkart/.env` (contains secrets; do not commit).
- `ecosystem.config.cjs` - pm2 app `shopkart-api` running `src/server.js`.
- `deploy-backend.sh [--seed]` - rsync `../backend`, write `.env`, `npm ci --omit=dev`, optional `npm run seed`, pm2 restart + systemd startup, health check.
- `deploy-frontend.sh` - build `../frontend`, `wrangler pages deploy dist`.

## Deploy
```
infra/deploy-backend.sh --seed   # first time (seed); omit --seed afterwards
infra/deploy-frontend.sh
```
Frontend env is read from `frontend/.env.production` at build time.

## SSH and logs
```
source infra/outputs.env
ssh -i infra/shopkart-key.pem ubuntu@$EIP
pm2 logs shopkart-api        # on the box
pm2 status
sudo journalctl -u caddy -f  # TLS / proxy
mongosh shopkart
```

## Cloudflare notes
Token and account id are used via `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. The Pages custom domain reports `error` until the first deployment exists; re-check with
`GET /accounts/$ID/pages/projects/shopkart/domains/shopkart.spacesdrive.cc` (or PATCH it to re-validate).

## Re-creating the Lightsail box
```
export AWS_PROFILE=claude-dev AWS_DEFAULT_REGION=ap-south-1
aws lightsail create-key-pair --key-pair-name shopkart-ls --query privateKeyBase64 --output text > infra/shopkart-key.pem && chmod 600 infra/shopkart-key.pem
aws lightsail create-instances --instance-names shopkart-api --availability-zone ap-south-1a --blueprint-id ubuntu_24_04 --bundle-id micro_3_1 --key-pair-name shopkart-ls --user-data file://infra/user-data.sh
aws lightsail attach-static-ip --static-ip-name shopkart-ip --instance-name shopkart-api
aws lightsail put-instance-public-ports --instance-name shopkart-api --port-infos fromPort=22,toPort=22,protocol=tcp fromPort=80,toPort=80,protocol=tcp fromPort=443,toPort=443,protocol=tcp
```
SSH user is `ubuntu`. Upgrade the bundle later via a snapshot (`create-instance-snapshot` then `create-instances-from-snapshot` with a bigger bundle).
