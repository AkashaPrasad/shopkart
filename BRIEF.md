# ShopKart — Project Brief & Contract (READ FULLY BEFORE WRITING CODE)

ShopKart is a premium micro-goods store: small, delightful desk & everyday objects (stickers, enamel pins, gel pens, mini notebooks, washi tape, keychains, desk candies, phone grips, cable ties, stamps). Every product costs between ₹49 and ₹799 (see PRICING RESET at the bottom). A typical order is ₹300–₹900. Payments are LIVE via Razorpay (test mode keys) and the owner will test real checkouts, so the money path must be bulletproof.

Brand voice: confident, warm, witty, short. Tagline: "Tiny things. Big joy." Never generic marketing filler.

## Repos / layout
```
shopkart/
  BRIEF.md             <- this file
  backend/             <- Node 22 + Express 5 + Mongoose 8 (ESM, plain JS)  port 5000
  frontend/            <- Vite 6 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + motion + reactbits  port 5173
  infra/               <- AWS EC2 provisioning + Cloudflare Pages/DNS scripts
```

## Hosting (already decided, do not change)
- Frontend: Cloudflare Pages project `shopkart` → custom domain **https://shopkart.spacesdrive.cc**
- Backend + MongoDB: single AWS EC2 (ap-south-1, Ubuntu 24.04) → **https://shopkart-api.spacesdrive.cc** (Caddy auto-TLS, DNS-only A record). Node app managed by pm2 on :5000, MongoDB 8 local on the box.
- Google OAuth client id: `908727741603-rfddg0k2rt3dgp4v4napu5rv6qan01c6.apps.googleusercontent.com` (ID-token flow via Google Identity Services, no redirect URI needed)
- Razorpay test key id: `rzp_test_TnpOuMhoTxLpMj`

## Auth rules (product decision)
- Browsing (landing, catalog, product detail, cart) requires NO auth. Cart works as guest (localStorage) and is merged into the server cart on login.
- Auth required ONLY for: checkout/placing an order, orders page, addresses, account.
- When an unauthenticated user hits "Checkout", redirect to `/login?next=/checkout` and come back after login with cart intact.
- Auth methods: email+password (bcrypt, min 8 chars) and Google (GIS ID token posted to backend).
- Session: JWT (7d) set as httpOnly cookie `sk_token` AND returned in JSON body. Backend accepts either the cookie or `Authorization: Bearer <jwt>`. Frontend uses `credentials: 'include'` and ALSO stores the token in localStorage and sends the Bearer header (belt and braces so prod cross-subdomain works even if cookie is blocked).
  - Cookie options prod: `httpOnly, secure, sameSite: 'none', domain: '.shopkart.spacesdrive.cc', path: '/'`; dev: `httpOnly, sameSite: 'lax'`.
- CORS: allow origins from env `CORS_ORIGINS` (comma separated) with credentials.

## Money rules (non-negotiable)
- All amounts stored & computed in INTEGER PAISE on the backend. API returns paise; frontend formats as ₹ with 2 decimals only when needed (₹49 not ₹49.00; ₹49.50 when fractional).
- Server recomputes every total from DB prices at checkout. Client-sent prices are ignored.
- Shipping: FREE when subtotal ≥ ₹79 (7900 paise), else ₹9 (900). Show "Add ₹X more for free shipping" progress in cart.
- Coupons (seeded, case-insensitive): `WELCOME10` = 10% off subtotal (max ₹20 off), `FLAT5` = ₹5 off when subtotal ≥ ₹50, `FREESHIP` = free shipping. One coupon per order. Invalid/expired/min-not-met must return a clear error message.
- Max quantity per line item: 10. Stock enforced server-side at add-to-cart and at checkout (return 409 with the offending items so the UI can fix the cart).
- Razorpay: backend creates the Razorpay order (`receipt` = our order id), frontend opens Checkout.js, backend verifies `razorpay_signature` (HMAC-SHA256 of `order_id|payment_id` with key secret) before marking paid. Also implement webhook `POST /api/webhooks/razorpay` verifying `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET` (raw body) handling `payment.captured` and `payment.failed` idempotently.
- Order statuses: `pending_payment` → `paid` → `processing` → `shipped` → `delivered`; also `payment_failed`, `cancelled`. User can cancel while `pending_payment|paid|processing`. User can "Retry payment" while `pending_payment|payment_failed` (creates a fresh Razorpay order for the same DB order). Stock is decremented when paid; restored on cancel.
- Payment modal dismissed by user → order stays `pending_payment`, UI shows a calm "Payment not completed" state with Retry.

## Data models (Mongoose)
User { name, email (unique, lowercase), passwordHash?, googleId?, avatarUrl?, phone?, role: 'user'|'admin', createdAt }
Product { slug (unique), name, tagline, description (markdown-ish plain text), price (paise), compareAtPrice? (paise), images: [url], category: 'stickers'|'pins'|'stationery'|'desk'|'tech'|'snacks', tags: [string], stock, rating (0-5, 1 decimal), reviewCount, colors?: [{name, hex}], badges: ['new'|'bestseller'|'limited'], isActive, createdAt }
Cart { user (unique), items: [{ product, qty, color? }], coupon?: code, updatedAt }
Address { user, fullName, phone, pincode, line1, line2?, landmark?, city, state, type: 'home'|'work'|'other', isDefault, createdAt }
Order { user, orderNumber ('SK-' + 6 uppercase alnum, unique), items: [{ product, name, slug, image, price, qty, color? }] (SNAPSHOT), address: {...snapshot}, subtotal, discount, shipping, total (all paise), coupon?, status, payment: { provider: 'razorpay', razorpayOrderId?, razorpayPaymentId?, razorpaySignature?, method?, paidAt?, failureReason? }, timeline: [{ status, at, note? }], createdAt }
Coupon { code (unique, uppercase), type: 'percent'|'flat'|'freeship', value, maxDiscount?, minSubtotal?, isActive, expiresAt? }

## REST API (base `/api`) — JSON; errors ALWAYS `{ error: { code: string, message: string, details?: any } }` with proper HTTP status.
Auth
- POST /auth/register {name,email,password} → 201 {user, token}
- POST /auth/login {email,password} → {user, token}
- POST /auth/google {credential} (GIS ID token) → {user, token} (creates or links account by email)
- POST /auth/logout → {ok:true} (clears cookie)
- GET  /auth/me → {user}   (401 if not logged in)
- PATCH /auth/me {name?, phone?} → {user}
- POST /auth/change-password {currentPassword,newPassword} → {ok:true}  (400 if google-only account)
Products (public)
- GET /products?q=&category=&sort=(popular|price_asc|price_desc|newest|rating)&minPrice=&maxPrice=&tag=&page=1&limit=24 → {items, total, page, pages, facets:{categories:[{key,count}], priceRange:{min,max}}}
- GET /products/featured → {items} (8 bestsellers/new)
- GET /products/:slug → {product, related:[...4]}
Cart (works for guests too — guests keep it client-side; server cart only when authed)
- GET /cart → {cart: {items:[{product:{...lite}, qty, color, lineTotal}], coupon, summary}}
- POST /cart/items {productId, qty, color?} → cart (adds or increments; validates stock & max 10)
- PATCH /cart/items/:productId {qty, color?} → cart (qty 0 removes)
- DELETE /cart/items/:productId → cart
- DELETE /cart → empty cart
- POST /cart/merge {items:[{productId,qty,color?}]} → cart (used right after login; sums qty, caps at 10/stock)
- POST /cart/coupon {code} → cart (400 with message if invalid); DELETE /cart/coupon → cart
- `summary` = { subtotal, discount, shipping, total, freeShippingThreshold: 7900, amountToFreeShipping, itemCount }
- POST /cart/quote {items:[...], coupon?} → {summary, items:[...with lineTotal and stock/availability flags]}  (public: lets guest cart show server-truth totals & coupon validity)
Addresses (auth)
- GET /addresses → {items}; POST /addresses → 201 {address}; PATCH /addresses/:id; DELETE /addresses/:id; POST /addresses/:id/default
- Validation: phone = 10 digits starting 6-9; pincode = 6 digits; max 10 addresses; first address auto-default; deleting default promotes the most recent remaining one.
- GET /addresses/pincode/:pincode → {city, state, valid} (proxies https://api.postalpincode.in/pincode/:pin, 5s timeout, cached in memory)
Orders (auth)
- POST /orders/checkout {addressId, coupon?} → 201 {order, razorpay:{orderId, amount, currency, keyId, prefill:{name,email,contact}}}  (409 {details:{issues:[...]}} when stock/price problems; 400 when cart empty / address invalid)
- POST /orders/:id/verify {razorpay_order_id, razorpay_payment_id, razorpay_signature} → {order}  (400 on bad signature → marks payment_failed)
- POST /orders/:id/payment-failed {reason?} → {order} (frontend calls on Razorpay `payment.failed` event)
- POST /orders/:id/retry-payment → {razorpay:{...}}
- POST /orders/:id/cancel → {order}
- GET /orders?page=&limit= → {items,total,page,pages}; GET /orders/:id → {order}
Webhooks
- POST /webhooks/razorpay (raw body) → 200 {ok:true}
Misc
- GET /health → {ok:true, uptime, db:'connected'}
- Rate limit auth routes (20/min/IP). helmet. morgan. express.json limit 100kb. Zod validation on all bodies/queries.

## Frontend route map
```
/                     Landing (SHORT: hero + product marquee/bento + 3 value props + CTA + footer). Must be jaw-dropping but fast.
/shop                 Catalog: search, category chips, sort, price filter, grid with hover, skeletons, empty state, pagination/infinite "Load more"
/product/:slug        PDP: gallery, price/compare price, color picker, qty stepper, add to cart (toast + mini-cart opens), stock/low-stock state, related
/cart                 Full cart page: line items with qty stepper, remove (undo toast), coupon input, free-shipping progress, summary, "Checkout" (redirects to login if needed)
/login, /register     Auth (email/password + Google button), ?next= support, inline validation, show/hide password, error states
/checkout             Stepper: 1) Address (select existing / add new inline with pincode autofill) 2) Review (items, coupon, totals) 3) Pay (Razorpay). Handles: no addresses, stock changed, coupon invalid, payment dismissed/failed, double-click protection, network errors.
/order/success/:id    Confirmation with order number, timeline, items, "Continue shopping"
/account              Dashboard shell with side nav: Overview, Orders, Addresses, Profile
/account/orders, /account/orders/:id (detail + timeline + retry/cancel), /account/addresses (CRUD, set default, edit/delete with confirm), /account/profile (name/phone/password)
/404
```
Global: sticky header with logo, search, cart badge (count animates), account menu; slide-over mini-cart; toast system (sonner); dark/light theme toggle (default light); route transitions; scroll restoration; mobile nav; focus states; reduced-motion respected.

## Design system (frontend) — NO generic AI look
- Fonts: display `Fraunces` (variable, optical size, used for H1/H2 with italic accents), body/UI `Inter Tight`. Load via Google Fonts in index.html.
- Palette (light): bg `#F7F4EE` (warm paper), surface `#FFFFFF`, ink `#111111`, muted `#6B6760`, line `#E6E1D8`, accent `#FF5A1F` (tangerine), accent-2 `#1E5EFF` (cobalt, sparingly), success `#1A9A5B`, danger `#D7263D`. Dark: bg `#0E0D0C`, surface `#171513`, ink `#F4F1EA`, line `#2A2724`.
- Radius: 14px cards, 999px pills. Shadows soft & warm. Borders 1px line color; generous whitespace; 8px grid.
- Motion: `motion` (framer-motion v12 `motion/react`) for layout/presence; ReactBits components for hero text (SplitText/BlurText), backgrounds (Silk/Aurora/Iridescence – pick ONE for hero), SpotlightCard/TiltedCard for bento, CountUp for stats, Magnet on CTA. Keep animations < 600ms, easing `[0.22,1,0.36,1]`. Always wrap in `useReducedMotion` check.
- Price typography: tabular nums. Buttons: pill, 44px tall, ink bg / paper text; accent for primary CTA.

## Env
backend/.env: PORT=5000 MONGODB_URI=mongodb://127.0.0.1:27017/shopkart JWT_SECRET=... CORS_ORIGINS=http://localhost:5173 GOOGLE_CLIENT_ID=... RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=<from Razorpay dashboard> RAZORPAY_WEBHOOK_SECRET=shopkart_webhook_secret COOKIE_DOMAIN= (empty in dev, `.shopkart.spacesdrive.cc` in prod) NODE_ENV
frontend/.env: VITE_API_URL=http://localhost:5000/api  VITE_GOOGLE_CLIENT_ID=908727741603-rfddg0k2rt3dgp4v4napu5rv6qan01c6.apps.googleusercontent.com  VITE_RAZORPAY_KEY_ID=rzp_test_xxx
frontend/.env.production: VITE_API_URL=https://shopkart-api.spacesdrive.cc/api (same other vars)

## Quality bar
- Everything typed (TS on frontend, Zod on backend). No `any` sprawl. No dead code, no placeholder lorem ipsum, no "Feature 1/2/3" cards.
- Every list has loading skeleton, empty state, and error state with retry.
- Every destructive action (delete address, remove item, cancel order) has undo or confirm.
- Forms: inline validation on blur, disabled submit while pending, server errors surfaced next to fields.
- Mobile first; test at 375px and 1440px.
- Lighthouse-friendly: lazy routes, image `loading="lazy"`, no layout shift (aspect-ratio boxes).

## Admin console (added 2026-10-14)
Seeded admin account: `test@gmail.com` / `test@123` (role `admin`). Admin routes live under `/api/admin/*`, guarded by auth + `role === 'admin'` (403 `FORBIDDEN` otherwise). Frontend routes under `/admin/*` (RequireAdmin guard → non-admins get a 403 page, guests go to `/login?next=/admin`).
- GET /admin/stats → { revenue (paise, sum of paid+processing+shipped+delivered orders), ordersCount, ordersByStatus: {status: count}, customersCount, productsCount, lowStock: [{_id,name,slug,stock,image}] (stock ≤ 5), recentOrders: [...5 with user {name,email}], salesByDay: [{date:'YYYY-MM-DD', total, count}] (last 14 days, zero-filled) }
- GET /admin/orders?status=&q=(orderNumber|email|name)&page=&limit= → {items (each with user {_id,name,email}), total, page, pages}
- GET /admin/orders/:id → {order (with user)}
- PATCH /admin/orders/:id/status {status, note?} → {order}. Allowed: paid→processing, processing→shipped, shipped→delivered, and (pending_payment|paid|processing)→cancelled (restores stock; refund if paid). Invalid transition → 409 `INVALID_TRANSITION`. Appends to timeline.
- GET /admin/products?q=&category=&page=&limit=&includeInactive=1 → paginated products (admins see inactive too)
- PATCH /admin/products/:id {stock?, price?, compareAtPrice?, isActive?, badges?} → {product}  (zod-validated; price 100..100000 paise)
- GET /admin/customers?q=&page=&limit= → {items: [{_id,name,email,role,createdAt,ordersCount,totalSpent}], total, page, pages}
- GET /admin/coupons → {items}; PATCH /admin/coupons/:id {isActive?} → {coupon}
Frontend `/admin` (dashboard: stat tiles, 14-day sales bar chart (pure SVG/CSS, no chart lib), orders-by-status, low-stock list, recent orders), `/admin/orders` (table with status filter chips, search, pagination; row click → `/admin/orders/:id` with full detail + status-advance buttons + cancel with confirm + timeline), `/admin/products` (table: image, name, category, price, stock inline-editable with save, active toggle, badges), `/admin/customers` (table), `/admin/coupons` (toggle active). Admin layout: left sidebar on desktop, top tabs on mobile; fully responsive.

## Wishlist + micro-interactions (added 2026-10-14)
Backend: `Wishlist { user (unique), products: [ObjectId] }`. Auth-only endpoints: `GET /wishlist` → `{items: [ProductLite...]}` (ProductLite = same lite shape the cart uses, plus `images[0]` as `image`, `stock`, `badges`, `tagline`), `POST /wishlist/:productId` → `{items}` (idempotent), `DELETE /wishlist/:productId` → `{items}`, `POST /wishlist/merge {productIds: []}` → `{items}` (union, max 100). Guests keep a localStorage list `sk_wishlist` (product ids + lite product) and it merges into the account on login (same pattern as cart).
Frontend: `src/store/wishlist.ts` (zustand, guest/server modes, `toggle(product)`, `has(id)`, `sync(isAuthed)`), heart toggle on every ProductCard (top-right over the image, outline → filled tangerine with a 300ms pop + tiny burst, optimistic), heart next to Add-to-cart on the PDP ("Save" / "Saved"), header heart icon with animated count badge, `/wishlist` page (public route: grid of saved items with "Add to cart" (opens mini-cart) and remove-with-undo; empty state), "Wishlist" link in the account dropdown + mobile nav. Add-to-cart feedback everywhere: the clicked button shows a check state, the product image "flies" to the header cart icon (small clone, transform/opacity only, ~550ms, [0.22,1,0.36,1]), then the cart badge bumps; respects reduced motion (fallback: badge bump only).

## Standard storefront feature set (added 2026-10-14) — everything a mainstream UK/India store has
### Backend additions
- **Reviews**: `Review { user, product, order?, rating 1-5, title (≤80), body (≤1000), verified: bool, createdAt }`, unique (user, product). `GET /products/:slug/reviews?page=&limit=10&sort=(newest|highest|lowest)` → `{items (with user {name, avatarUrl}), total, page, pages, breakdown: {5:n,4:n,3:n,2:n,1:n}, average}`. `POST /products/:slug/reviews` (auth) → 201 `{review}`; `verified = true` when the user has an order containing the product with status in paid|processing|shipped|delivered. One review per user per product (409 `ALREADY_REVIEWED`). `PATCH/DELETE /reviews/:id` (owner or admin). Recompute `product.rating` (1 decimal) and `product.reviewCount` after each write. Seed 2–4 realistic reviews for ~15 products (from seeded users; create 6 extra seeded reviewer users `reviewer1..6@shopkart.dev`).
- **Search suggestions**: `GET /products/suggest?q=` → `{products: [{slug,name,image,price,category}] (≤6, prefix/word match on name+tags), categories: [key] (matching), query}`; 20-req/10s rate limit; empty q → `{products:[],categories:[]}`.
- **Catalog filters**: add `inStock=1`, `onSale=1` (compareAtPrice > price), `minRating=4`, `badge=new|bestseller|limited` to `GET /products`.
- **Cash on delivery**: `POST /orders/checkout` accepts `paymentMethod: 'razorpay' | 'cod'` (default razorpay). COD: order created with status `processing`, `payment.provider='cod'`, `payment.method='cod'`, stock decremented immediately, a ₹10 (1000 paise) COD fee line `codFee` added to totals (summary includes `codFee`), max COD total ₹500. Response `{order}` without `razorpay`. Admin marking `delivered` on a COD order sets `payment.paidAt`. Cancel COD order → restore stock (no refund).
- **Returns**: `POST /orders/:id/return {reason: enum('damaged','wrong_item','not_as_described','changed_mind','other'), note?}` (auth owner) allowed when status `delivered` and `deliveredAt` within 7 days → status `return_requested`, timeline entry. Admin `PATCH /admin/orders/:id/status` additionally allows `return_requested → returned` (triggers Razorpay refund for online payments; COD → `refundStatus:'manual'`) and `return_requested → delivered` (reject, with note). Add `return: {reason, note, requestedAt, resolvedAt?}` to Order.
- **Reorder**: `POST /orders/:id/reorder` → adds all still-available items to the cart (caps by stock/10) → `{cart, skipped: [{name, reason}]}`.
- **Invoice**: `GET /orders/:id/invoice` → JSON `{order, seller: {name:'ShopKart', address, gstin:'(not registered)', email}, invoiceNumber: 'INV-'+orderNumber, issuedAt}` (frontend renders a printable page).
- **Password reset**: `POST /auth/forgot-password {email}` → always 200 `{ok:true}`; creates `PasswordReset { user, tokenHash, expiresAt (30 min), usedAt? }`; sends email via nodemailer if `SMTP_URL` env is set, otherwise logs the link (`${APP_URL}/reset-password?token=...`) with console.info. `POST /auth/reset-password {token, password}` → `{ok:true}` (400 `INVALID_TOKEN` on bad/expired/used). Env: `APP_URL` (https://shopkart.spacesdrive.cc), `SMTP_URL` optional, `MAIL_FROM`.
- **Transactional email (optional, same nodemailer)**: on order paid/COD placed → "Order confirmed" email; on shipped → "Order shipped"; no-op without SMTP_URL (log only).
- **Account deletion**: `DELETE /auth/me {password?}` → 200 `{ok:true}`: anonymises user (name 'Deleted user', email `deleted+<id>@shopkart.invalid`, clears googleId/passwordHash), deletes cart/wishlist/addresses, keeps orders (anonymised). Password required if the account has one.
- **Back-in-stock alerts**: `POST /products/:slug/notify {email}` (public; uses user email if authed) → 201 `{ok:true}`; `StockAlert { product, email, notifiedAt? }` unique (product,email). When admin sets stock from 0 → >0, mark alerts + send email (or log).
- **Newsletter & contact**: `POST /newsletter {email}` → 201 (idempotent 200), `POST /contact {name,email,subject,message}` → 201; models `Subscriber`, `ContactMessage`; admin `GET /admin/subscribers`, `GET /admin/messages`.
- **Admin additions**: `GET /admin/reviews?page=` + `DELETE /admin/reviews/:id`; returns handling via status endpoint above; `GET /admin/orders` gains `paymentMethod` filter; stats add `returnsPending`, `codOrders`.
### Frontend additions
- **Header search autosuggest**: debounced (200ms) dropdown with product thumbnails + prices + matching categories, keyboard navigation (↑↓ Enter Esc), "See all results for 'q'" row, recent searches (localStorage, max 5, clearable). Mobile: full-screen search sheet with the same suggestions.
- **PDP**: reviews section (average + breakdown bars + list with pagination + sort; "Write a review" button → dialog (auth required, redirect with next=) with star picker, title, body, inline validation; shows "Verified purchase" chip), share button (Web Share API → fallback copy link toast), "Recently viewed" strip (localStorage, max 8, excludes current), estimated delivery ("Get it by {date+3 days}" computed client-side; pincode-aware if a default address exists), "Notify me" on sold-out → email dialog → `POST /products/:slug/notify`.
- **Catalog**: filter chips for In stock / On sale / 4★ & up / New / Bestsellers; active-filter pills with ×; "Clear all".
- **Checkout**: payment method choice (Razorpay online vs Cash on delivery with ₹10 fee + ₹500 cap note), optional "Delivery instructions" (≤200 chars, stored on order as `deliveryNote`) and "Gift message" (≤200, `giftMessage`) — backend must accept these two fields on checkout and show in admin + order detail.
- **Orders**: "Buy again" (reorder → opens mini-cart, shows skipped toast), "Request return" (delivered within 7 days → dialog with reason select + note), "Download invoice" → `/account/orders/:id/invoice` printable page (brand header, seller block, buyer block, items table, totals, payment info, `window.print()` button, print stylesheet).
- **Auth**: `/forgot-password`, `/reset-password?token=` pages; "Forgot password?" link on login.
- **Profile**: "Delete account" (danger zone; AlertDialog; password confirm when applicable) → logout → home with toast.
- **Global**: top announcement bar ("Free shipping over ₹79 · Ships in 24h" rotating 3 messages, dismissible, remembered), cookie consent banner (bottom, "We use essential cookies only" with Accept + link to /privacy, remembered in localStorage, GDPR-style), React ErrorBoundary with friendly recovery UI, `public/robots.txt` + `public/sitemap.xml` (static routes), offline/network-error banner when the API is unreachable.
- **Static pages** (`src/pages/static/*`, same design, real copy, no lorem): `/help` (FAQ accordion: orders, shipping, returns, payments, account), `/contact` (form → `POST /contact`, success state), `/shipping-returns`, `/privacy`, `/terms`. Footer links point to them. `/track` → "Track an order" input (order number) → redirects to the order (auth) with helpful guest message.
- **Admin additions**: Reviews page (list + delete), Returns queue (orders with `return_requested`: approve → returned / reject → delivered with note), "Mark delivered" collects COD, Subscribers + Messages pages, payment-method filter on orders.

## PRICING RESET (added 2026-10-14, supersedes every earlier price rule)
The owner wants realistic prices, not bargain-bin. New rules (all paise on the backend):
- Product prices: ₹49–₹799 (4900–79900). Guide: stickers ₹99–₹249, pins ₹199–₹399, stationery ₹99–₹499, desk ₹149–₹799, tech ₹99–₹599, snacks ₹49–₹199. compareAtPrice 15–30% higher where present. Keep names/images/stock as they are; only reprice.
- Shipping: FREE when subtotal ≥ ₹499 (49900); else ₹49 (4900). `freeShippingThreshold` in summaries = 49900.
- COD: fee ₹30 (3000), max COD order total ₹5,000 (500000).
- Coupons: `WELCOME10` = 10% off, max ₹100 off; `FLAT50` = ₹50 off when subtotal ≥ ₹499 (replaces FLAT5 — remove FLAT5); `FREESHIP` unchanged.
- Brand copy: drop every "under ₹50 / under ₹20 / ₹9" claim. New promise: "Small objects. Honest prices." Nav/filter preset "Under ₹199" (replaces "Under ₹20"); price presets in /shop: "Under ₹199", "₹199–₹399", "₹399+"; stats on landing: "₹49 starting price", "Free shipping over ₹499". FAQ/help/footer copy must match these numbers.
- Frontend: import thresholds from `src/lib/constants.ts` (FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, COD_FEE, COD_MAX, PRICE_PRESETS) instead of hardcoding numbers; prefer the `summary` values from the API where available.
