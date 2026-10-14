# ShopKart API

Node 22+ · Express 5 · Mongoose · Zod · Razorpay. Plain ESM JavaScript.
The API contract lives in [`../BRIEF.md`](../BRIEF.md). This service implements it exactly.

## Quick start

```bash
cp .env.example .env        # then fill in the secrets (see below)
npm install
npm run seed                # 24 products, 3 coupons, 2 demo users (safe to re-run)
npm run dev                 # http://localhost:5000/api, restarts on file changes
npm test                    # node:test + supertest against the shopkart_test database
```

`npm start` runs the server without the file watcher (use this under pm2 in production).

### Demo accounts (created by `npm run seed`)

| Email                | Password      | Role  |
| -------------------- | ------------- | ----- |
| `admin@shopkart.dev` | `Admin@12345` | admin |
| `test@shopkart.dev`  | `Test@12345`  | user  |

Coupons: `WELCOME10` (10% off, max ₹20), `FLAT5` (₹5 off at ₹50+), `FREESHIP` (free shipping).

The seed upserts by product slug, coupon code and user email. Re-running it resets catalogue
fields (including **stock**) and the demo passwords to their seeded values. It never touches
orders, carts, addresses or other users.

## Environment

| Variable                  | Required | Default                 | Notes                                                                                     |
| ------------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                | no       | `development`           | `development`, `production` or `test`. Production switches cookies to cross-site mode.   |
| `PORT`                    | no       | `5000`                  |                                                                                           |
| `HOST`                    | no       | all interfaces          | Comma-separated bind addresses. On macOS set `127.0.0.1,::1` (see below).                 |
| `MONGODB_URI`             | yes      |                         | e.g. `mongodb://127.0.0.1:27017/shopkart`                                                 |
| `JWT_SECRET`              | yes      |                         | At least 16 characters. Tokens last 7 days.                                               |
| `CORS_ORIGINS`            | no       | `http://localhost:5173` | Comma-separated list of allowed origins (credentials enabled).                            |
| `GOOGLE_CLIENT_ID`        | yes      |                         | Audience used to verify Google Identity Services ID tokens.                               |
| `RAZORPAY_KEY_ID`         | yes      |                         | Returned to the client as `razorpay.keyId`.                                               |
| `RAZORPAY_KEY_SECRET`     | yes      |                         | Creates orders and refunds, and verifies payment signatures.                              |
| `RAZORPAY_WEBHOOK_SECRET` | yes      |                         | Verifies `X-Razorpay-Signature` on `/api/webhooks/razorpay`.                              |
| `COOKIE_DOMAIN`           | no       | host-only               | Empty in dev; `.shopkart.spacesdrive.cc` in production.                                   |
| `AUTH_RATE_LIMIT_MAX`     | no       | `20`                    | Requests per minute per IP on register, login, google and change-password.               |

> **macOS and port 5000:** AirPlay Receiver (ControlCenter) listens on `*:5000`, so
> `localhost:5000` gets answered by AirPlay with a `403`. Setting `HOST=127.0.0.1,::1` binds the
> loopback addresses explicitly, which take precedence. Leave `HOST` unset on Linux/EC2.

## Layout

```
src/
  server.js            boot, Mongo connect, graceful shutdown (SIGINT/SIGTERM)
  app.js               Express app (exported for tests)
  config.js            env parsed and validated with zod
  seed.js              npm run seed (also exports seedCatalog/seedCoupons for tests)
  data/catalog.js      seed products, coupons and demo users
  models/              User, Product, Cart, Address, Order, Coupon
  routes/              routers + zod schemas per resource
  controllers/         request handlers
  services/            pricing (computeSummary), cart view, inventory, order lifecycle,
                       razorpay, googleAuth, pincode
  middleware/          auth, validate, error, rateLimit
  schemas/common.js    shared zod fields (objectId, email, phone, pincode, pagination)
  utils/               ApiError, asyncHandler, orderNumber, money
tests/api.test.js      end-to-end API tests
```

## How the money path works

- **One pricing function.** `services/pricing.js#computeSummary(items, coupon)` is pure and works in
  integer paise. Cart, `/cart/quote` and checkout all use it, so totals can't drift apart.
  Shipping is free at a subtotal of ₹79 or more, otherwise ₹9. Coupons are re-validated at checkout.
- **Checkout** reads prices from the DB, checks stock (409 `STOCK_CONFLICT` with
  `details.issues`), snapshots items and address, then creates the Razorpay order with
  `receipt = order._id`. If Razorpay is unreachable, the draft order is deleted and the API returns 502.
- **Verify** recomputes `HMAC_SHA256(order_id|payment_id, key_secret)` and compares it with
  `crypto.timingSafeEqual`. A bad signature returns 400 and marks the order `payment_failed`.
  A paid order is never downgraded.
- **Exactly-once stock.** `pending_payment|payment_failed → paid` is one atomic
  `findOneAndUpdate`, so concurrent verify and webhook calls can't double-decrement. Stock then
  drops via `findOneAndUpdate({ stock: { $gte: qty } })` per line, all-or-nothing. If an item sold
  out while the customer was paying, the order is cancelled and a full refund starts
  (409 `SOLD_OUT_DURING_PAYMENT`).
- **Cancel** (`pending_payment|paid|processing`) restores stock once and refunds paid orders through
  Razorpay. The outcome is stored in `payment.refundId` / `payment.refundStatus` and on the timeline.
  A payment that arrives for a cancelled or already-paid order is refunded automatically.
- **Retry payment** creates a fresh Razorpay order for the same DB order. Every Razorpay order id is
  remembered, so late webhooks for an older attempt still match.
- **Webhook** `POST /api/webhooks/razorpay` uses `express.raw` and is mounted before
  `express.json()`. It handles `payment.captured` (amount-checked) and `payment.failed`
  idempotently and always answers `200 {ok:true}` once the signature is valid.

In Razorpay's dashboard, point the webhook at `https://shopkart-api.spacesdrive.cc/api/webhooks/razorpay`
with the `payment.captured` and `payment.failed` events and the same secret as `RAZORPAY_WEBHOOK_SECRET`.

## Errors

Every error has the shape `{ "error": { "code", "message", "details?" } }`.

| Status | Codes (examples)                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` (`details.fields` maps field → message), `INVALID_JSON`, `CART_EMPTY`, `ADDRESS_INVALID`, `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_INACTIVE`, `COUPON_MIN_NOT_MET`, `MAX_QTY_EXCEEDED`, `INVALID_COLOR`, `INVALID_SIGNATURE`, `INVALID_PASSWORD`, `NO_PASSWORD_SET`, `ADDRESS_LIMIT_REACHED` |
| 401    | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS`, `GOOGLE_ACCOUNT`, `GOOGLE_TOKEN_INVALID`, `GOOGLE_EMAIL_UNVERIFIED` |
| 404    | `ROUTE_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `ITEM_NOT_IN_CART`, `ADDRESS_NOT_FOUND`, `ORDER_NOT_FOUND`                              |
| 409    | `EMAIL_TAKEN`, `DUPLICATE`, `OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE`, `STOCK_CONFLICT` (all with `details.issues`), `ORDER_NOT_CANCELLABLE`, `ORDER_NOT_PAYABLE`, `ORDER_STATE_CHANGED`, `ORDER_CANCELLED`, `SOLD_OUT_DURING_PAYMENT` |
| 413    | `PAYLOAD_TOO_LARGE`                                                                                                             |
| 429    | `RATE_LIMITED`                                                                                                                  |
| 502    | `PAYMENT_PROVIDER_ERROR`                                                                                                        |
| 503    | `PINCODE_LOOKUP_UNAVAILABLE`                                                                                                    |
| 500    | `INTERNAL_ERROR` (stack only in `details` outside production)                                                                   |

Stock issue items look like
`{ productId, slug, name, reason: 'unavailable'|'out_of_stock'|'insufficient_stock'|'max_qty', message, requestedQty, availableQty }`.

## Additive response fields

These sit on top of the contract. Nothing in the contract was renamed or removed.

- Every document has both `_id` and `id`. `user.hasPassword` tells the profile page whether to show
  "change password". `passwordHash` and `googleId` are never returned.
- Cart and quote lines: `{ productId, product, qty, color, lineTotal, inStock, maxQty, available, issue }`.
  The cart also has `couponError` (why a saved coupon isn't applying right now, or `null`).
- `POST /cart/merge` also returns `adjustments` (items that were capped or skipped). `POST /cart/quote`
  returns `coupon: { code, valid, message }`.
- `DELETE /addresses/:id` returns `{ ok: true, items }`. `POST /orders/:id/retry-payment` returns
  `{ order, razorpay }`. `GET /orders/:id` also accepts the order number (`SK-XXXXXX`).
- `order.payment.refundId` / `refundStatus` (`pending|processed|failed`) record refunds.

## Tests

`npm test` uses the real local MongoDB (database `shopkart_test`, dropped before and after the run)
and the **real Razorpay test API** for order creation. Payments are simulated with correctly computed
HMAC signatures, so the refunds attempted for those made-up payment ids fail with
`Refund failed ... HTTP 404` in the log. The orders record `refundStatus: failed`, which is expected.
The pincode test accepts a 503 if India Post's API is down.
