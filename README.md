<p align="center">
  <img src="frontend/public/favicon.svg" width="72" alt="ShopKart" />
</p>

<h1 align="center">ShopKart</h1>

<p align="center">
  <strong>Tiny things. Big joy.</strong><br />
  A production-grade MERN storefront for small desk and everyday objects, with Razorpay payments, Google sign-in, an admin console and a hand-crafted UI.
</p>

<p align="center">
  <a href="https://shopkart.spacesdrive.cc">Live store</a> ·
  <a href="https://shopkart-api.spacesdrive.cc/api/health">API status</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#local-development">Run locally</a> ·
  <a href="#deployment">Deploy</a>
</p>

---

## Features

| Storefront | Account | Admin console |
| --- | --- | --- |
| Landing page, catalog with search, filters and sort, product pages with reviews and ratings | Email + password and Google sign-in, forgot/reset password | Dashboard with revenue, 14-day sales chart, status counts, low stock |
| Guest cart with server-side quoting, coupons, free-shipping progress | Address book with PIN code auto-fill and default handling | Orders: filter, search, advance status, cancel, approve or reject returns |
| Wishlist for guests and members, merged on login | Orders with timeline, retry payment, cancel, return request, reorder, printable invoice | Products: inline stock edits, activate or deactivate |
| Razorpay (UPI, cards, netbanking, wallets) and cash on delivery | Profile, password change, account deletion | Customers, coupons, reviews, subscribers, contact messages |

## Overview

ShopKart is a complete e-commerce application built on the MERN stack (MongoDB, Express, React, Node) for small desk and everyday objects at realistic prices. It covers the full purchase journey: a marketing landing page, a filterable catalog, product detail pages, a cart that works for guests and signed-in users, a three-step checkout with address management, Razorpay payments with server-side signature verification, and an account dashboard with order tracking.

Browsing never requires an account. Authentication is only requested at checkout. An admin console tracks orders, returns, stock, reviews and customers.

### Highlights

- **Payments done properly.** Amounts are computed in integer paise on the server from database prices, never from the client. Razorpay orders are created server-side, signatures are verified with a constant-time HMAC comparison, webhooks are idempotent, stock is decremented atomically on payment, and cancelled paid orders are refunded automatically.
- **Guest-first cart.** Guests keep a cart in local storage, totals come from a server quote endpoint so prices and coupons are always truthful, and the cart merges into the account on login.
- **Every edge case has a state.** Sold-out items, low stock, quantity caps, invalid coupons, free-shipping thresholds, stock changing mid-checkout, dismissed or failed payments with retry, address limits, default-address promotion on delete, and more.
- **Deliberate design.** Warm paper palette, Fraunces display type, tangerine accent, motion that respects `prefers-reduced-motion`, dark mode, skeletons, empty states and error states for every list.
- **Tested.** The API ships with an integration suite (node:test + supertest) covering auth, catalog, cart, addresses, checkout, payment verification, race conditions and webhooks.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, shadcn/ui, Motion, ReactBits, Zustand, React Router, React Hook Form + Zod |
| Backend | Node 22, Express 5, Mongoose 8, Zod, JSON Web Tokens, bcrypt, Helmet, express-rate-limit |
| Payments | Razorpay Orders API + Checkout.js, webhook verification, refunds |
| Auth | Email + password, Google Identity Services (ID-token flow) |
| Database | MongoDB 9 |
| Hosting | Cloudflare Pages (frontend), AWS Lightsail with Caddy + pm2 (API and database) |

## Architecture

```
shopkart/
├── frontend/         React SPA (Vite)
│   └── src/
│       ├── pages/        route components (landing, shop, product, cart, checkout, account…)
│       ├── components/   ui (shadcn), layout, product, cart, checkout, address, account, landing, reactbits
│       ├── store/        zustand stores: auth, cart, theme
│       ├── hooks/        data hooks (products, orders, addresses, pincode, razorpay)
│       └── lib/          api client, formatters
├── backend/          Express API
│   └── src/
│       ├── models/       User, Product, Cart, Address, Order, Coupon
│       ├── routes/       auth, products, cart, addresses, orders, webhooks
│       ├── controllers/  request handling per resource
│       ├── services/     pricing, inventory, orders, razorpay, googleAuth, pincode
│       ├── middleware/   auth, validation, error handling, rate limiting
│       └── seed.js       idempotent catalog + coupon + user seed
├── infra/            provisioning and deploy scripts (Lightsail, Caddy, pm2, Cloudflare Pages)
└── BRIEF.md          product brief and API contract the app was built against
```

### Request flow for a purchase

1. Client posts `POST /api/orders/checkout` with an address id and optional coupon.
2. Server re-validates stock, recomputes totals from the database, creates the order as `pending_payment`, and creates a Razorpay order for the same amount.
3. Client opens Razorpay Checkout with the returned order id.
4. On success the client posts the payment id and signature to `POST /api/orders/:id/verify`; the server verifies the HMAC, marks the order `paid`, and decrements stock atomically.
5. Razorpay's webhook (`POST /api/webhooks/razorpay`) provides a second, idempotent confirmation path for `payment.captured` and `payment.failed`.

## API

All endpoints live under `/api` and return JSON. Errors always have the shape `{ "error": { "code", "message", "details?" } }`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password` |
| Catalog | `GET /products`, `GET /products/featured`, `GET /products/:slug` |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:productId`, `DELETE /cart/items/:productId`, `DELETE /cart`, `POST /cart/merge`, `POST /cart/coupon`, `DELETE /cart/coupon`, `POST /cart/quote` |
| Addresses | `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`, `POST /addresses/:id/default`, `GET /addresses/pincode/:pincode` |
| Orders | `POST /orders/checkout`, `POST /orders/:id/verify`, `POST /orders/:id/payment-failed`, `POST /orders/:id/retry-payment`, `POST /orders/:id/cancel`, `GET /orders`, `GET /orders/:id` |
| System | `GET /health`, `POST /webhooks/razorpay` |

The full contract, including money rules and status transitions, is in [`BRIEF.md`](BRIEF.md). The backend's own [`README`](backend/README.md) documents error codes.

## Local development

Prerequisites: Node 22+, a local MongoDB (`mongod` on 27017), and test-mode Razorpay keys.

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in JWT_SECRET, Razorpay and Google values
npm install
npm run seed                  # catalog, coupons, reviews, demo users
npm run dev                   # http://localhost:5000/api

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env          # VITE_API_URL, VITE_GOOGLE_CLIENT_ID, VITE_RAZORPAY_KEY_ID
npm install
npm run dev                   # http://localhost:5173
```

Demo accounts after seeding:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `test@shopkart.dev` | `Test@12345` |
| Admin (console at `/admin`) | `test@gmail.com` | `test@123` |
Coupons: `WELCOME10` (10% off, max ₹100), `FLAT50` (₹50 off over ₹499), `FREESHIP`.

Razorpay test mode accepts card `4111 1111 1111 1111` with any future expiry and CVV, or UPI id `success@razorpay`.

### Tests

```bash
cd backend && npm test        # integration suite against a disposable shopkart_test database
cd frontend && npm run build  # type-check + production build
```

## Deployment

The `infra/` directory contains everything needed to reproduce the production setup.

| Script | Purpose |
| --- | --- |
| `infra/user-data.sh` | Provisions an Ubuntu host: Node 22, MongoDB, Caddy (automatic HTTPS), pm2, swap |
| `infra/deploy-backend.sh [--seed]` | Rsyncs the API to the host, installs dependencies, writes the env file, restarts pm2, runs a health check |
| `infra/deploy-frontend.sh` | Builds the SPA and publishes it to Cloudflare Pages |
| `infra/scan-secrets.sh` | Fails if credential-like strings are present in tracked files |

Environment files (`backend/.env`, `infra/backend.env.production`, `infra/cloudflare.env`) and SSH keys are git-ignored by design. See [`infra/README.md`](infra/README.md) for the step-by-step runbook.

## Security notes

- Secrets are never committed; `.env.example` files document every variable.
- Passwords are hashed with bcrypt; sessions are JWTs delivered as `HttpOnly; Secure` cookies and also accepted as bearer tokens.
- Helmet, CORS allow-listing, request-size limits and per-IP rate limiting protect the API.
- Razorpay payment and webhook signatures are verified with timing-safe comparisons; amounts are never trusted from the client.

## License

[MIT](LICENSE)
