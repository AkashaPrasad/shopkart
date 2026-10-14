import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, it } from 'node:test';

// Configure the environment before anything reads config.
process.env.NODE_ENV = 'test';
// Emails are logged with console.info when SMTP_URL is unset; keep test output quiet
// (tests that inspect emails capture console.info themselves).
delete process.env.SMTP_URL;
console.info = () => {};
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/shopkart_test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';

const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { app } = await import('../src/app.js');
const { config } = await import('../src/config.js');
const { seedCatalog, seedCoupons, seedReviews, seedUsers } = await import('../src/seed.js');
const { Product } = await import('../src/models/Product.js');
const { ORDER_STATUSES, Order } = await import('../src/models/Order.js');
const { User } = await import('../src/models/User.js');

const api = () => request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PASSWORD = 'Secret@123';

const paymentSignature = (orderId, paymentId) =>
  crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const webhookSignature = (body) =>
  crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
const fakePaymentId = () => `pay_test${crypto.randomBytes(6).toString('hex')}`;

const fixture = (overrides) => ({
  tagline: 'A fixture with opinions.',
  description: 'Exists only so the tests have something to buy.',
  images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  tags: [],
  rating: 4,
  reviewCount: 1,
  badges: [],
  ...overrides,
});

const FIXTURES = [
  fixture({ slug: 'test-widget', name: 'Test Widget', category: 'desk', price: 15000, stock: 20, tags: ['alpha'], reviewCount: 30 }),
  fixture({
    slug: 'test-gadget',
    name: 'Test Gadget',
    category: 'tech',
    price: 40000,
    stock: 50,
    tags: ['beta'],
    rating: 4.9,
    reviewCount: 5,
    badges: ['new'],
    colors: [
      { name: 'Red', hex: '#FF0000' },
      { name: 'Blue', hex: '#0000FF' },
    ],
  }),
  fixture({ slug: 'test-scarce', name: 'Test Scarce', category: 'pins', price: 20000, stock: 2, reviewCount: 50, badges: ['bestseller'] }),
  fixture({ slug: 'test-sold-out', name: 'Test Sold Out', category: 'pins', price: 9900, stock: 0 }),
  fixture({ slug: 'test-hidden', name: 'Test Hidden', category: 'snacks', price: 10000, stock: 10, isActive: false }),
  fixture({ slug: 'test-snack', name: 'Test Snack Crunch', category: 'snacks', price: 5000, compareAtPrice: 6000, stock: 100, tags: ['beta'], reviewCount: 12 }),
];

const products = {};
const stockOf = async (slug) => (await Product.findOne({ slug })).stock;
const setStock = (slug, stock) => Product.updateOne({ slug }, { $set: { stock } });

async function register(email, name = 'Test Person') {
  const res = await api().post('/api/auth/register').send({ name, email, password: PASSWORD });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.token;
}

function assertError(res, status, code) {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
  assert.equal(typeof res.body.error.message, 'string');
}

before(async () => {
  await mongoose.connect(config.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes();
  await seedCoupons();
  for (const doc of await Product.insertMany(FIXTURES)) products[doc.slug] = doc;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('health', () => {
  it('reports a connected database', async () => {
    const res = await api().get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.db, 'connected');
    assert.equal(typeof res.body.uptime, 'number');
  });

  it('returns the standard error shape for unknown routes', async () => {
    assertError(await api().get('/api/nope'), 404, 'ROUTE_NOT_FOUND');
  });
});

describe('auth', () => {
  let token;

  it('registers a user, returns a token and sets the session cookie', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Asha', email: 'Asha@Example.com', password: PASSWORD });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'asha@example.com');
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.passwordHash, undefined);
    assert.equal(res.body.user.hasPassword, true);
    assert.ok(res.body.token);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('sk_token='));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    token = res.body.token;
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Asha', email: 'asha@example.com', password: PASSWORD });
    assertError(res, 409, 'EMAIL_TAKEN');
  });

  it('validates register input with field details', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'A', email: 'nope', password: 'short' });
    assertError(res, 400, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.fields.email);
    assert.ok(res.body.error.details.fields.password);
    assert.ok(res.body.error.details.fields.name);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    assertError(await api().post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrong-password' }), 401, 'INVALID_CREDENTIALS');
    assertError(await api().post('/api/auth/login').send({ email: 'ghost@example.com', password: PASSWORD }), 401, 'INVALID_CREDENTIALS');
    const res = await api().post('/api/auth/login').send({ email: 'ASHA@example.com', password: PASSWORD });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.name, 'Asha');
  });

  it('GET /me needs a session and accepts the Bearer header or the cookie', async () => {
    assertError(await api().get('/api/auth/me'), 401, 'UNAUTHENTICATED');
    assertError(await api().get('/api/auth/me').set(bearer('garbage')), 401, 'SESSION_EXPIRED');

    const viaBearer = await api().get('/api/auth/me').set(bearer(token));
    assert.equal(viaBearer.status, 200);
    assert.equal(viaBearer.body.user.email, 'asha@example.com');

    const viaCookie = await api().get('/api/auth/me').set('Cookie', `sk_token=${token}`);
    assert.equal(viaCookie.status, 200);
    assert.equal(viaCookie.body.user.email, 'asha@example.com');
  });

  it('updates profile name and phone, validating the phone', async () => {
    assertError(await api().patch('/api/auth/me').set(bearer(token)).send({ phone: '12345' }), 400, 'VALIDATION_ERROR');
    const res = await api().patch('/api/auth/me').set(bearer(token)).send({ name: 'Asha K', phone: '9876543210' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Asha K');
    assert.equal(res.body.user.phone, '9876543210');
  });

  it('changes the password only with the correct current password', async () => {
    const wrong = await api().post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'nope-nope', newPassword: 'NewSecret@123' });
    assertError(wrong, 400, 'INVALID_PASSWORD');
    const ok = await api().post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'NewSecret@123' });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body, { ok: true });
    const login = await api().post('/api/auth/login').send({ email: 'asha@example.com', password: 'NewSecret@123' });
    assert.equal(login.status, 200);
  });

  it('rejects an invalid Google credential with 401', async () => {
    const res = await api().post('/api/auth/google').send({ credential: 'definitely.not.a-real-google-id-token' });
    assertError(res, 401, 'GOOGLE_TOKEN_INVALID');
  });

  it('logout clears the cookie', async () => {
    const res = await api().post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.ok(res.headers['set-cookie'].some((c) => c.startsWith('sk_token=;')));
  });
});

describe('products', () => {
  it('lists active products with pagination and facets', async () => {
    const res = await api().get('/api/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 5);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.pages, 1);
    assert.ok(res.body.items.every((p) => p.slug !== 'test-hidden'));
    assert.ok(res.body.items[0].id && res.body.items[0]._id);
    assert.equal(res.body.facets.categories.length, 6);
    assert.deepEqual(res.body.facets.categories.find((c) => c.key === 'pins'), { key: 'pins', count: 2 });
    assert.deepEqual(res.body.facets.priceRange, { min: 5000, max: 40000 });
  });

  it('filters by category, search, tag and price, and sorts', async () => {
    const byCategory = await api().get('/api/products?category=pins');
    assert.deepEqual(byCategory.body.items.map((p) => p.slug).sort(), ['test-scarce', 'test-sold-out']);

    const bySearch = await api().get('/api/products?q=crunch');
    assert.deepEqual(bySearch.body.items.map((p) => p.slug), ['test-snack']);

    const byTag = await api().get('/api/products?tag=beta&sort=price_asc');
    assert.deepEqual(byTag.body.items.map((p) => p.slug), ['test-snack', 'test-gadget']);

    const byPrice = await api().get('/api/products?minPrice=15000&maxPrice=40000&sort=price_desc');
    assert.deepEqual(byPrice.body.items.map((p) => p.price), [40000, 20000, 15000]);
    // Category facet counts respect the price filter; the price range ignores it.
    assert.equal(byPrice.body.facets.categories.find((c) => c.key === 'snacks').count, 0);
    assert.deepEqual(byPrice.body.facets.priceRange, { min: 5000, max: 40000 });

    const paged = await api().get('/api/products?limit=2&page=2&sort=price_asc');
    assert.equal(paged.body.pages, 3);
    assert.deepEqual(paged.body.items.map((p) => p.price), [15000, 20000]);

    const popular = await api().get('/api/products');
    assert.equal(popular.body.items[0].slug, 'test-scarce');
  });

  it('rejects invalid query parameters', async () => {
    assertError(await api().get('/api/products?sort=cheapest'), 400, 'VALIDATION_ERROR');
    assertError(await api().get('/api/products?category=shoes'), 400, 'VALIDATION_ERROR');
    assertError(await api().get('/api/products?minPrice=500&maxPrice=100'), 400, 'VALIDATION_ERROR');
  });

  it('returns a product by slug with related items', async () => {
    const res = await api().get('/api/products/test-scarce');
    assert.equal(res.status, 200);
    assert.equal(res.body.product.name, 'Test Scarce');
    assert.ok(res.body.related.length <= 4 && res.body.related.length > 0);
    assert.ok(res.body.related.every((p) => p.slug !== 'test-scarce' && p.isActive));
    assert.equal(res.body.related[0].category, 'pins');
  });

  it('404s for unknown or inactive slugs', async () => {
    assertError(await api().get('/api/products/nope'), 404, 'PRODUCT_NOT_FOUND');
    assertError(await api().get('/api/products/test-hidden'), 404, 'PRODUCT_NOT_FOUND');
  });

  it('returns featured products', async () => {
    const res = await api().get('/api/products/featured');
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0 && res.body.items.length <= 8);
    assert.ok(res.body.items.every((p) => p.isActive));
  });
});

describe('cart', () => {
  let token;
  const cart = (res) => res.body.cart;

  before(async () => {
    token = await register('cart@example.com');
  });

  it('requires auth', async () => {
    assertError(await api().get('/api/cart'), 401, 'UNAUTHENTICATED');
  });

  it('starts empty', async () => {
    const res = await api().get('/api/cart').set(bearer(token));
    assert.equal(res.status, 200);
    assert.deepEqual(cart(res).items, []);
    assert.equal(cart(res).coupon, null);
    assert.deepEqual(cart(res).summary, {
      subtotal: 0,
      discount: 0,
      shipping: 0,
      codFee: 0,
      total: 0,
      freeShippingThreshold: 49900,
      amountToFreeShipping: 49900,
      itemCount: 0,
    });
  });

  it('adds and increments items, charging shipping below the threshold', async () => {
    await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-widget'].id, qty: 2 });
    const res = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-widget'].id, qty: 1 });
    assert.equal(res.status, 200);
    const [line] = cart(res).items;
    assert.equal(line.qty, 3);
    assert.equal(line.lineTotal, 45000);
    assert.equal(line.product.slug, 'test-widget');
    assert.equal(line.available, true);
    assert.deepEqual(cart(res).summary, {
      subtotal: 45000,
      discount: 0,
      shipping: 4900,
      codFee: 0,
      total: 49900,
      freeShippingThreshold: 49900,
      amountToFreeShipping: 4900,
      itemCount: 3,
    });
  });

  it('enforces the max quantity of 10 per item', async () => {
    const res = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-widget'].id, qty: 8 });
    assertError(res, 400, 'MAX_QTY_EXCEEDED');
    assertError(await api().patch(`/api/cart/items/${products['test-widget'].id}`).set(bearer(token)).send({ qty: 11 }), 400, 'MAX_QTY_EXCEEDED');
  });

  it('returns 409 with issues when stock is short or sold out', async () => {
    const short = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-scarce'].id, qty: 3 });
    assertError(short, 409, 'INSUFFICIENT_STOCK');
    assert.equal(short.body.error.details.issues[0].availableQty, 2);
    assert.equal(short.body.error.details.issues[0].reason, 'insufficient_stock');

    const soldOut = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-sold-out'].id, qty: 1 });
    assertError(soldOut, 409, 'OUT_OF_STOCK');
    assert.equal(soldOut.body.error.details.issues[0].reason, 'out_of_stock');

    const hidden = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-hidden'].id, qty: 1 });
    assertError(hidden, 404, 'PRODUCT_NOT_FOUND');
  });

  it('validates colours and defaults to the first one', async () => {
    const bad = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-gadget'].id, qty: 1, color: 'Green' });
    assertError(bad, 400, 'INVALID_COLOR');
    const res = await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-gadget'].id, qty: 1 });
    const line = cart(res).items.find((item) => item.product.slug === 'test-gadget');
    assert.equal(line.color, 'Red');
    const recolored = await api().patch(`/api/cart/items/${products['test-gadget'].id}`).set(bearer(token)).send({ qty: 1, color: 'blue' });
    assert.equal(cart(recolored).items.find((item) => item.product.slug === 'test-gadget').color, 'Blue');
  });

  it('updates quantities and unlocks free shipping at ₹499', async () => {
    const res = await api().patch(`/api/cart/items/${products['test-widget'].id}`).set(bearer(token)).send({ qty: 4 });
    assert.equal(res.status, 200);
    // 4 x 15000 + 40000 = 100000 >= 49900
    assert.equal(cart(res).summary.subtotal, 100000);
    assert.equal(cart(res).summary.shipping, 0);
    assert.equal(cart(res).summary.amountToFreeShipping, 0);
    assert.equal(cart(res).summary.total, 100000);
  });

  it('applies coupons case-insensitively and explains invalid ones', async () => {
    assertError(await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'BOGUS' }), 400, 'COUPON_NOT_FOUND');

    const welcome = await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'welcome10' });
    assert.equal(welcome.status, 200);
    assert.equal(cart(welcome).coupon, 'WELCOME10');
    assert.equal(cart(welcome).summary.discount, 10000);
    assert.equal(cart(welcome).summary.total, 90000);

    // 10% is capped at ₹100: 10 x 15000 + 3 x 40000 = 270000 -> 27000, capped to 10000.
    await api().patch(`/api/cart/items/${products['test-widget'].id}`).set(bearer(token)).send({ qty: 10 });
    const capped = await api().patch(`/api/cart/items/${products['test-gadget'].id}`).set(bearer(token)).send({ qty: 3 });
    assert.equal(cart(capped).summary.subtotal, 270000);
    assert.equal(cart(capped).summary.discount, 10000);

    assertError(await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'FLAT5' }), 400, 'COUPON_NOT_FOUND');
    const flat = await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'flat50' });
    assert.equal(cart(flat).summary.discount, 5000);

    const freeship = await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'freeship' });
    assert.equal(cart(freeship).coupon, 'FREESHIP');
    assert.equal(cart(freeship).summary.discount, 0);

    const removed = await api().delete('/api/cart/coupon').set(bearer(token));
    assert.equal(cart(removed).coupon, null);
  });

  it('removes items via qty 0 and DELETE', async () => {
    const zero = await api().patch(`/api/cart/items/${products['test-gadget'].id}`).set(bearer(token)).send({ qty: 0 });
    assert.deepEqual(cart(zero).items.map((item) => item.product.slug), ['test-widget']);
    assertError(await api().patch(`/api/cart/items/${products['test-gadget'].id}`).set(bearer(token)).send({ qty: 1 }), 404, 'ITEM_NOT_IN_CART');

    await api().patch(`/api/cart/items/${products['test-widget'].id}`).set(bearer(token)).send({ qty: 2 });
    const flatTooSmall = await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'FLAT50' });
    assertError(flatTooSmall, 400, 'COUPON_MIN_NOT_MET');
    assert.match(flatTooSmall.body.error.message, /₹499/);

    const freeshipSmall = await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'FREESHIP' });
    assert.equal(cart(freeshipSmall).summary.shipping, 0);
    assert.equal(cart(freeshipSmall).summary.total, 30000);

    const del = await api().delete(`/api/cart/items/${products['test-widget'].id}`).set(bearer(token));
    assert.deepEqual(cart(del).items, []);
  });

  it('merges a guest cart, summing and capping at 10 and stock', async () => {
    await api().post('/api/cart/items').set(bearer(token)).send({ productId: products['test-widget'].id, qty: 6 });
    const res = await api()
      .post('/api/cart/merge')
      .set(bearer(token))
      .send({
        items: [
          { productId: products['test-widget'].id, qty: 7 },
          { productId: products['test-scarce'].id, qty: 5 },
          { productId: products['test-sold-out'].id, qty: 1 },
          { productId: products['test-gadget'].id, qty: 1, color: 'Blue' },
        ],
      });
    assert.equal(res.status, 200);
    const qty = Object.fromEntries(cart(res).items.map((item) => [item.product.slug, item.qty]));
    assert.deepEqual(qty, { 'test-widget': 10, 'test-scarce': 2, 'test-gadget': 1 });
    assert.equal(cart(res).items.find((item) => item.product.slug === 'test-gadget').color, 'Blue');
    const reasons = Object.fromEntries(res.body.adjustments.map((a) => [a.productId, a.reason]));
    assert.equal(reasons[products['test-widget'].id], 'max_qty');
    assert.equal(reasons[products['test-scarce'].id], 'insufficient_stock');
    assert.equal(reasons[products['test-sold-out'].id], 'out_of_stock');
  });

  it('empties the cart', async () => {
    const res = await api().delete('/api/cart').set(bearer(token));
    assert.deepEqual(cart(res).items, []);
    assert.equal(cart(res).summary.total, 0);
  });

  it('quotes a guest cart publicly with availability flags and coupon validity', async () => {
    const res = await api()
      .post('/api/cart/quote')
      .send({
        items: [
          { productId: products['test-widget'].id, qty: 2 },
          { productId: products['test-scarce'].id, qty: 4 },
          { productId: products['test-sold-out'].id, qty: 1 },
          { productId: new mongoose.Types.ObjectId().toString(), qty: 1 },
        ],
        coupon: 'flat50',
      });
    assert.equal(res.status, 200);
    const [widget, scarce, soldOut, missing] = res.body.items;
    assert.equal(widget.available, true);
    assert.equal(widget.lineTotal, 30000);
    assert.equal(scarce.available, false);
    assert.equal(scarce.issue.reason, 'insufficient_stock');
    assert.equal(scarce.maxQty, 2);
    assert.equal(soldOut.inStock, false);
    assert.equal(soldOut.issue.reason, 'out_of_stock');
    assert.equal(missing.product, null);
    assert.equal(missing.issue.reason, 'unavailable');
    // 30000 + 80000 + 9900 = 119900; FLAT50 applies.
    assert.equal(res.body.summary.subtotal, 119900);
    assert.equal(res.body.summary.discount, 5000);
    assert.equal(res.body.summary.total, 114900);
    assert.deepEqual(res.body.coupon, { code: 'FLAT50', valid: true, message: null });

    const invalid = await api().post('/api/cart/quote').send({ items: [{ productId: products['test-widget'].id, qty: 1 }], coupon: 'FLAT50' });
    assert.equal(invalid.body.coupon.valid, false);
    assert.equal(invalid.body.summary.discount, 0);
    assert.equal(invalid.body.summary.shipping, 4900);
  });
});

describe('addresses', () => {
  let token;
  const valid = {
    fullName: 'Ravi Kumar',
    phone: '9876543210',
    pincode: '560001',
    line1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
  };
  const ids = {};

  before(async () => {
    token = await register('addr@example.com');
  });

  it('validates phone, pincode and required fields', async () => {
    const res = await api()
      .post('/api/addresses')
      .set(bearer(token))
      .send({ ...valid, phone: '5123456789', pincode: '12345', city: '' });
    assertError(res, 400, 'VALIDATION_ERROR');
    const { fields } = res.body.error.details;
    assert.ok(fields.phone && fields.pincode && fields.city);
  });

  it('makes the first address default and keeps exactly one default', async () => {
    const first = await api().post('/api/addresses').set(bearer(token)).send(valid);
    assert.equal(first.status, 201);
    assert.equal(first.body.address.isDefault, true);
    ids.first = first.body.address.id;

    const second = await api().post('/api/addresses').set(bearer(token)).send({ ...valid, line1: '2nd Cross', type: 'work' });
    assert.equal(second.body.address.isDefault, false);
    ids.second = second.body.address.id;

    const third = await api().post('/api/addresses').set(bearer(token)).send({ ...valid, line1: '3rd Main', isDefault: true });
    assert.equal(third.body.address.isDefault, true);
    ids.third = third.body.address.id;

    const list = await api().get('/api/addresses').set(bearer(token));
    assert.equal(list.body.items.length, 3);
    assert.equal(list.body.items[0].id, ids.third);
    assert.equal(list.body.items.filter((a) => a.isDefault).length, 1);
  });

  it('updates and sets the default explicitly', async () => {
    const patched = await api().patch(`/api/addresses/${ids.second}`).set(bearer(token)).send({ landmark: 'Near the park', city: 'Mysuru' });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.address.landmark, 'Near the park');
    assert.equal(patched.body.address.city, 'Mysuru');
    assertError(await api().patch(`/api/addresses/${ids.second}`).set(bearer(token)).send({ phone: '123' }), 400, 'VALIDATION_ERROR');

    const def = await api().post(`/api/addresses/${ids.first}/default`).set(bearer(token));
    assert.equal(def.body.address.isDefault, true);
    const list = await api().get('/api/addresses').set(bearer(token));
    assert.deepEqual(list.body.items.filter((a) => a.isDefault).map((a) => a.id), [ids.first]);
  });

  it('promotes the most recent remaining address when the default is deleted', async () => {
    const res = await api().delete(`/api/addresses/${ids.first}`).set(bearer(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    const list = await api().get('/api/addresses').set(bearer(token));
    assert.equal(list.body.items.length, 2);
    assert.deepEqual(list.body.items.filter((a) => a.isDefault).map((a) => a.id), [ids.third]);
  });

  it("can't touch another user's address", async () => {
    const other = await register('other-addr@example.com');
    assertError(await api().patch(`/api/addresses/${ids.third}`).set(bearer(other)).send({ city: 'Pune' }), 404, 'ADDRESS_NOT_FOUND');
    assertError(await api().delete(`/api/addresses/${ids.third}`).set(bearer(other)), 404, 'ADDRESS_NOT_FOUND');
    assertError(await api().delete('/api/addresses/not-an-id').set(bearer(other)), 400, 'VALIDATION_ERROR');
  });

  it('caps saved addresses at 10', async () => {
    for (let i = 0; i < 8; i += 1) {
      const res = await api().post('/api/addresses').set(bearer(token)).send({ ...valid, line1: `House ${i}` });
      assert.equal(res.status, 201);
    }
    assertError(await api().post('/api/addresses').set(bearer(token)).send(valid), 400, 'ADDRESS_LIMIT_REACHED');
  });

  it('looks up a pincode (or reports the upstream as unavailable)', async () => {
    assertError(await api().get('/api/addresses/pincode/12ab').set(bearer(token)), 400, 'VALIDATION_ERROR');
    const res = await api().get('/api/addresses/pincode/560001').set(bearer(token));
    if (res.status === 503) {
      assert.equal(res.body.error.code, 'PINCODE_LOOKUP_UNAVAILABLE');
    } else {
      assert.equal(res.status, 200);
      assert.equal(res.body.valid, true);
      assert.equal(res.body.state, 'Karnataka');
      assert.ok(res.body.city);
    }
  });
});

describe('checkout and payments', () => {
  let token;
  let addressId;

  const addToCart = (slug, qty) => api().post('/api/cart/items').set(bearer(token)).send({ productId: products[slug].id, qty });
  const checkout = (body = {}) => api().post('/api/orders/checkout').set(bearer(token)).send({ addressId, ...body });
  const verify = (orderId, body) => api().post(`/api/orders/${orderId}/verify`).set(bearer(token)).send(body);
  const signedVerifyBody = (razorpayOrderId, paymentId = fakePaymentId()) => ({
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: paymentSignature(razorpayOrderId, paymentId),
  });

  before(async () => {
    token = await register('buyer@example.com', 'Buyer Bee');
    const res = await api()
      .post('/api/addresses')
      .set(bearer(token))
      .send({ fullName: 'Buyer Bee', phone: '9123456780', pincode: '400001', line1: '1 Marine Drive', city: 'Mumbai', state: 'Maharashtra' });
    addressId = res.body.address.id;
  });

  it('rejects an empty cart and an invalid address with 400', async () => {
    assertError(await checkout(), 400, 'CART_EMPTY');
    await addToCart('test-widget', 1);
    assertError(await checkout({ addressId: new mongoose.Types.ObjectId().toString() }), 400, 'ADDRESS_INVALID');
  });

  it('returns 409 with issues when stock changed since add-to-cart', async () => {
    await addToCart('test-scarce', 2);
    await setStock('test-scarce', 1);
    const res = await checkout();
    assertError(res, 409, 'STOCK_CONFLICT');
    assert.deepEqual(
      res.body.error.details.issues.map((issue) => [issue.slug, issue.reason, issue.availableQty]),
      [['test-scarce', 'insufficient_stock', 1]],
    );
    await setStock('test-scarce', 2);
    await api().delete(`/api/cart/items/${products['test-scarce'].id}`).set(bearer(token));
  });

  it('rejects an invalid coupon at checkout', async () => {
    assertError(await checkout({ coupon: 'NOPE' }), 400, 'COUPON_NOT_FOUND');
  });

  let order;
  let razorpay;

  it('creates an order from server prices plus a real Razorpay order', async () => {
    await api().delete('/api/cart').set(bearer(token));
    await addToCart('test-widget', 3);
    await addToCart('test-gadget', 1);
    await api().post('/api/cart/coupon').set(bearer(token)).send({ code: 'WELCOME10' });

    const res = await checkout();
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ({ order, razorpay } = res.body);
    // 3 x 15000 + 40000 = 85000 (free shipping); WELCOME10 = 8500 off.
    assert.equal(order.subtotal, 85000);
    assert.equal(order.discount, 8500);
    assert.equal(order.shipping, 0);
    assert.equal(order.total, 76500);
    assert.equal(order.coupon, 'WELCOME10');
    assert.equal(order.status, 'pending_payment');
    assert.match(order.orderNumber, /^SK-[A-Z0-9]{6}$/);
    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].price, 15000);
    assert.equal(order.address.city, 'Mumbai');
    assert.equal(order.stockDeducted, undefined);
    assert.match(razorpay.orderId, /^order_/);
    assert.equal(razorpay.amount, 76500);
    assert.equal(razorpay.currency, 'INR');
    assert.equal(razorpay.keyId, config.RAZORPAY_KEY_ID);
    assert.deepEqual(razorpay.prefill, { name: 'Buyer Bee', email: 'buyer@example.com', contact: '9123456780' });
    assert.equal(order.payment.razorpayOrderId, razorpay.orderId);
  });

  it('marks payment_failed on a bad signature without touching stock', async () => {
    const before = await stockOf('test-widget');
    const res = await verify(order.id, {
      razorpay_order_id: razorpay.orderId,
      razorpay_payment_id: fakePaymentId(),
      razorpay_signature: 'deadbeef'.repeat(8),
    });
    assertError(res, 400, 'INVALID_SIGNATURE');
    assert.equal(res.body.error.details.order.status, 'payment_failed');
    assert.equal(await stockOf('test-widget'), before);
  });

  it('retries payment with a fresh Razorpay order', async () => {
    const res = await api().post(`/api/orders/${order.id}/retry-payment`).set(bearer(token));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.notEqual(res.body.razorpay.orderId, razorpay.orderId);
    assert.equal(res.body.razorpay.amount, 76500);
    assert.equal(res.body.order.status, 'pending_payment');
    razorpay = res.body.razorpay;
  });

  it('verifies a correctly signed payment: paid, stock decremented once, cart cleared', async () => {
    const widgetBefore = await stockOf('test-widget');
    const gadgetBefore = await stockOf('test-gadget');
    const body = signedVerifyBody(razorpay.orderId);

    const res = await verify(order.id, body);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'paid');
    assert.equal(res.body.order.payment.razorpayPaymentId, body.razorpay_payment_id);
    assert.ok(res.body.order.payment.paidAt);
    assert.equal(await stockOf('test-widget'), widgetBefore - 3);
    assert.equal(await stockOf('test-gadget'), gadgetBefore - 1);

    const again = await verify(order.id, body);
    assert.equal(again.status, 200);
    assert.equal(again.body.order.status, 'paid');
    assert.equal(await stockOf('test-widget'), widgetBefore - 3);

    const cartRes = await api().get('/api/cart').set(bearer(token));
    assert.deepEqual(cartRes.body.cart.items, []);
    assert.equal(cartRes.body.cart.coupon, null);

    const statuses = res.body.order.timeline.map((t) => t.status);
    assert.deepEqual(statuses, ['pending_payment', 'payment_failed', 'pending_payment', 'paid']);
  });

  it('does not double-decrement under concurrent verifications', async () => {
    await addToCart('test-snack', 2);
    const created = await checkout();
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const before = await stockOf('test-snack');
    const body = signedVerifyBody(created.body.razorpay.orderId);
    const results = await Promise.all([1, 2, 3].map(() => verify(created.body.order.id, body)));
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(await stockOf('test-snack'), before - 2);
  });

  it('cancelling a paid order restores stock exactly once', async () => {
    const widgetBefore = await stockOf('test-widget');
    const res = await api().post(`/api/orders/${order.id}/cancel`).set(bearer(token));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'cancelled');
    assert.ok(res.body.order.payment.refundStatus);
    assert.equal(await stockOf('test-widget'), widgetBefore + 3);

    const again = await api().post(`/api/orders/${order.id}/cancel`).set(bearer(token));
    assert.equal(again.status, 200);
    assert.equal(await stockOf('test-widget'), widgetBefore + 3);

    assertError(await api().post(`/api/orders/${order.id}/retry-payment`).set(bearer(token)), 409, 'ORDER_NOT_PAYABLE');
  });

  it('handles payment-failed reports and cancelling an unpaid order', async () => {
    await addToCart('test-widget', 1);
    const created = await checkout();
    const id = created.body.order.id;
    const stockBefore = await stockOf('test-widget');

    const failed = await api().post(`/api/orders/${id}/payment-failed`).set(bearer(token)).send({ reason: 'Card declined' });
    assert.equal(failed.status, 200);
    assert.equal(failed.body.order.status, 'payment_failed');
    assert.equal(failed.body.order.payment.failureReason, 'Card declined');

    assertError(await api().post(`/api/orders/${id}/cancel`).set(bearer(token)), 409, 'ORDER_NOT_CANCELLABLE');
    const retried = await api().post(`/api/orders/${id}/retry-payment`).set(bearer(token));
    assert.equal(retried.status, 200);
    const cancelled = await api().post(`/api/orders/${id}/cancel`).set(bearer(token));
    assert.equal(cancelled.body.order.status, 'cancelled');
    assert.equal(cancelled.body.order.payment.refundStatus, undefined);
    assert.equal(await stockOf('test-widget'), stockBefore);
  });

  it('cancels and refunds when an item sells out during payment', async () => {
    await api().delete('/api/cart').set(bearer(token));
    await addToCart('test-scarce', 2);
    const created = await checkout();
    assert.equal(created.status, 201);
    await setStock('test-scarce', 1);
    const res = await verify(created.body.order.id, signedVerifyBody(created.body.razorpay.orderId));
    assertError(res, 409, 'SOLD_OUT_DURING_PAYMENT');
    assert.equal(res.body.error.details.order.status, 'cancelled');
    assert.equal(await stockOf('test-scarce'), 1);
    await setStock('test-scarce', 2);
  });

  it('lists and fetches only my orders', async () => {
    const list = await api().get('/api/orders?limit=2').set(bearer(token));
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 2);
    assert.equal(list.body.total, 4);
    assert.equal(list.body.pages, 2);

    const one = await api().get(`/api/orders/${order.id}`).set(bearer(token));
    assert.equal(one.body.order.orderNumber, order.orderNumber);
    const byNumber = await api().get(`/api/orders/${order.orderNumber}`).set(bearer(token));
    assert.equal(byNumber.body.order.id, order.id);

    const stranger = await register('stranger@example.com');
    assertError(await api().get(`/api/orders/${order.id}`).set(bearer(stranger)), 404, 'ORDER_NOT_FOUND');
    assertError(await api().post(`/api/orders/${order.id}/cancel`).set(bearer(stranger)), 404, 'ORDER_NOT_FOUND');
  });

  describe('webhook', () => {
    const send = (payload, signature) => {
      const raw = JSON.stringify(payload);
      return api()
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', signature ?? webhookSignature(raw))
        .send(raw);
    };
    const paymentEvent = (event, razorpayOrderId, amount, extra = {}) => ({
      entity: 'event',
      event,
      payload: { payment: { entity: { id: fakePaymentId(), order_id: razorpayOrderId, amount, method: 'upi', ...extra } } },
    });

    it('rejects a bad signature', async () => {
      assertError(await send({ event: 'payment.captured' }, 'f'.repeat(64)), 400, 'INVALID_SIGNATURE');
      assertError(await send({ event: 'payment.captured' }, 'not-hex'), 400, 'INVALID_SIGNATURE');
    });

    it('marks an order paid on payment.captured, idempotently', async () => {
      await addToCart('test-widget', 2);
      const created = await checkout();
      const { order: pending, razorpay: rzp } = created.body;
      const before = await stockOf('test-widget');

      const event = paymentEvent('payment.captured', rzp.orderId, pending.total);
      const first = await send(event);
      assert.equal(first.status, 200);
      assert.deepEqual(first.body, { ok: true });
      const second = await send(event);
      assert.equal(second.status, 200);

      const saved = await Order.findById(pending.id);
      assert.equal(saved.status, 'paid');
      assert.equal(saved.payment.method, 'upi');
      assert.equal(await stockOf('test-widget'), before - 2);

      // A late failure event must not downgrade a paid order.
      await send(paymentEvent('payment.failed', rzp.orderId, pending.total, { error_description: 'late failure' }));
      assert.equal((await Order.findById(pending.id)).status, 'paid');
    });

    it('marks payment_failed on payment.failed and ignores unknown events', async () => {
      await addToCart('test-widget', 1);
      const created = await checkout();
      const { order: pending, razorpay: rzp } = created.body;
      const res = await send(paymentEvent('payment.failed', rzp.orderId, pending.total, { error_description: 'Bank declined' }));
      assert.equal(res.status, 200);
      const saved = await Order.findById(pending.id);
      assert.equal(saved.status, 'payment_failed');
      assert.equal(saved.payment.failureReason, 'Bank declined');

      assert.equal((await send({ event: 'refund.processed', payload: {} })).status, 200);
    });
  });

  it('refuses to report success for a payment on a cancelled order', async () => {
    await api().delete('/api/cart').set(bearer(token));
    await addToCart('test-widget', 1);
    const created = await checkout();
    const cancelled = await api().post(`/api/orders/${created.body.order.id}/cancel`).set(bearer(token));
    assert.equal(cancelled.body.order.status, 'cancelled');
    const stockBefore = await stockOf('test-widget');

    const res = await verify(created.body.order.id, signedVerifyBody(created.body.razorpay.orderId));
    assertError(res, 409, 'ORDER_CANCELLED');
    assert.equal(res.body.error.details.order.status, 'cancelled');
    assert.ok(res.body.error.details.order.payment.refundStatus);
    assert.equal(await stockOf('test-widget'), stockBefore);
  });
});

describe('admin', () => {
  let adminToken;
  let userToken;
  let buyerToken;
  let addressId;
  const asAdmin = (req) => req.set(bearer(adminToken));

  async function paidOrder(slug, qty) {
    await api().post('/api/cart/items').set(bearer(buyerToken)).send({ productId: products[slug].id, qty });
    const created = await api().post('/api/orders/checkout').set(bearer(buyerToken)).send({ addressId });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const razorpayOrderId = created.body.razorpay.orderId;
    const paymentId = fakePaymentId();
    const verified = await api()
      .post(`/api/orders/${created.body.order.id}/verify`)
      .set(bearer(buyerToken))
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: paymentSignature(razorpayOrderId, paymentId),
      });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    return verified.body.order;
  }

  before(async () => {
    adminToken = await register('boss@example.com', 'Boss Lady');
    await User.updateOne({ email: 'boss@example.com' }, { $set: { role: 'admin' } });
    userToken = await register('pleb@example.com');
    buyerToken = await register('admin-buyer@example.com', 'Admin Buyer');
    const res = await api()
      .post('/api/addresses')
      .set(bearer(buyerToken))
      .send({ fullName: 'Admin Buyer', phone: '9988776655', pincode: '110001', line1: '5 Janpath', city: 'New Delhi', state: 'Delhi' });
    addressId = res.body.address.id;
  });

  it('rejects guests with 401 and non-admins with 403 FORBIDDEN', async () => {
    for (const path of ['/api/admin/stats', '/api/admin/orders', '/api/admin/products', '/api/admin/customers', '/api/admin/coupons']) {
      assertError(await api().get(path), 401, 'UNAUTHENTICATED');
      assertError(await api().get(path).set(bearer(userToken)), 403, 'FORBIDDEN');
    }
    assertError(await api().patch(`/api/admin/products/${products['test-widget'].id}`).set(bearer(userToken)).send({ stock: 1 }), 403, 'FORBIDDEN');
  });

  it('returns dashboard stats with 14 zero-filled sales days', async () => {
    const res = await asAdmin(api().get('/api/admin/stats'));
    assert.equal(res.status, 200);
    const body = res.body;
    for (const key of ['revenue', 'ordersCount', 'customersCount', 'productsCount']) assert.equal(typeof body[key], 'number', key);
    assert.ok(body.revenue > 0);
    assert.deepEqual(Object.keys(body.ordersByStatus).sort(), [...ORDER_STATUSES].sort());
    assert.equal(Object.values(body.ordersByStatus).reduce((a, b) => a + b, 0), body.ordersCount);
    assert.equal(body.productsCount, FIXTURES.length);
    assert.ok(body.lowStock.some((p) => p.slug === 'test-sold-out'));
    assert.ok(body.lowStock.every((p) => p.stock <= 5 && 'image' in p && p.name));
    assert.ok(body.recentOrders.length <= 5 && body.recentOrders.length > 0);
    assert.ok(body.recentOrders.every((o) => o.user.email && o.user.name && o.orderNumber));

    assert.equal(body.salesByDay.length, 14);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    assert.equal(body.salesByDay.at(-1).date, today);
    assert.ok(body.salesByDay.every((d, i, all) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && (i === 0 || all[i - 1].date < d.date)));
    assert.equal(body.salesByDay.slice(0, -1).reduce((sum, d) => sum + d.total, 0), 0);
    assert.equal(body.salesByDay.at(-1).total, body.revenue);
  });

  let fulfilled;

  it('moves an order through fulfilment and rejects invalid transitions with 409', async () => {
    fulfilled = await paidOrder('test-widget', 1);
    const move = (status, note) => asAdmin(api().patch(`/api/admin/orders/${fulfilled.id}/status`)).send({ status, note });

    const skip = await move('delivered');
    assertError(skip, 409, 'INVALID_TRANSITION');
    assert.deepEqual(skip.body.error.details, { from: 'paid', to: 'delivered', allowed: ['processing', 'cancelled'] });
    assertError(await move('teleported'), 400, 'VALIDATION_ERROR');

    const processing = await move('processing');
    assert.equal(processing.status, 200);
    assert.equal(processing.body.order.status, 'processing');
    assert.deepEqual(processing.body.order.user, { _id: processing.body.order.user._id, name: 'Admin Buyer', email: 'admin-buyer@example.com' });

    assert.equal((await move('shipped', 'Handed to Delhivery, AWB 1234')).body.order.status, 'shipped');
    const delivered = await move('delivered');
    assert.equal(delivered.body.order.status, 'delivered');
    assertError(await move('cancelled'), 409, 'INVALID_TRANSITION');

    const timeline = delivered.body.order.timeline;
    assert.deepEqual(timeline.slice(-3).map((t) => t.status), ['processing', 'shipped', 'delivered']);
    assert.equal(timeline.at(-2).note, 'Handed to Delhivery, AWB 1234');
  });

  it('cancels a paid order: stock restored once and a refund attempted', async () => {
    const order = await paidOrder('test-gadget', 2);
    const stockAfterPayment = await stockOf('test-gadget');
    const res = await asAdmin(api().patch(`/api/admin/orders/${order.id}/status`)).send({ status: 'cancelled' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'cancelled');
    assert.ok(res.body.order.payment.refundStatus);
    assert.ok(res.body.order.timeline.some((t) => t.note === 'Cancelled by ShopKart.'));
    assert.equal(await stockOf('test-gadget'), stockAfterPayment + 2);
    assertError(await asAdmin(api().patch(`/api/admin/orders/${order.id}/status`)).send({ status: 'cancelled' }), 409, 'INVALID_TRANSITION');
  });

  it('lists, filters and fetches orders with their customer', async () => {
    const mine = await asAdmin(api().get('/api/admin/orders?q=admin-buyer&limit=50'));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.total, 2);
    assert.ok(mine.body.items.every((o) => o.user.email === 'admin-buyer@example.com'));

    const byNumber = await asAdmin(api().get(`/api/admin/orders?q=${fulfilled.orderNumber.toLowerCase()}`));
    assert.deepEqual(byNumber.body.items.map((o) => o.id), [fulfilled.id]);

    const delivered = await asAdmin(api().get('/api/admin/orders?status=delivered'));
    assert.ok(delivered.body.items.length >= 1 && delivered.body.items.every((o) => o.status === 'delivered'));
    assertError(await asAdmin(api().get('/api/admin/orders?status=lost')), 400, 'VALIDATION_ERROR');

    const one = await asAdmin(api().get(`/api/admin/orders/${fulfilled.id}`));
    assert.equal(one.body.order.user.name, 'Admin Buyer');
    assertError(await asAdmin(api().get(`/api/admin/orders/${new mongoose.Types.ObjectId()}`)), 404, 'ORDER_NOT_FOUND');
  });

  it('lists products (inactive on request) and patches stock, price and flags', async () => {
    const active = await asAdmin(api().get('/api/admin/products'));
    assert.ok(active.body.items.every((p) => p.isActive));
    const all = await asAdmin(api().get('/api/admin/products?includeInactive=1&limit=100'));
    assert.equal(all.body.total, FIXTURES.length);
    assert.ok(all.body.items.some((p) => p.slug === 'test-hidden'));

    const id = products['test-sold-out'].id;
    const patch = (body) => asAdmin(api().patch(`/api/admin/products/${id}`)).send(body);
    const restocked = await patch({ stock: 25 });
    assert.equal(restocked.status, 200);
    assert.equal(restocked.body.product.stock, 25);
    assert.equal((await api().get('/api/products/test-sold-out')).body.product.stock, 25);

    assertError(await patch({ price: 50 }), 400, 'VALIDATION_ERROR');
    assertError(await patch({ stock: -1 }), 400, 'VALIDATION_ERROR');
    assertError(await patch({ compareAtPrice: 500 }), 400, 'VALIDATION_ERROR');
    assertError(await patch({}), 400, 'VALIDATION_ERROR');

    const updated = await patch({ price: 11000, compareAtPrice: 15000, badges: ['new', 'new'], isActive: false });
    assert.equal(updated.body.product.price, 11000);
    assert.equal(updated.body.product.compareAtPrice, 15000);
    assert.deepEqual(updated.body.product.badges, ['new']);
    assertError(await api().get('/api/products/test-sold-out'), 404, 'PRODUCT_NOT_FOUND');

    const reset = await patch({ stock: 0, price: 9900, compareAtPrice: null, badges: [], isActive: true });
    assert.equal(reset.body.product.compareAtPrice, undefined);
    assert.equal(reset.body.product.stock, 0);
  });

  it('lists customers with ordersCount and totalSpent', async () => {
    const res = await asAdmin(api().get('/api/admin/customers?q=admin-buyer'));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    const [customer] = res.body.items;
    assert.deepEqual(Object.keys(customer).sort(), ['_id', 'createdAt', 'email', 'name', 'ordersCount', 'role', 'totalSpent']);
    assert.equal(customer.ordersCount, 2);
    // Only the delivered order counts towards spend; the cancelled one was refunded.
    assert.equal(customer.totalSpent, fulfilled.total);

    const everyone = await asAdmin(api().get('/api/admin/customers?limit=2&page=1'));
    assert.equal(everyone.body.items.length, 2);
    assert.ok(everyone.body.pages >= 2);
  });

  it('lists and toggles coupons', async () => {
    const list = await asAdmin(api().get('/api/admin/coupons'));
    assert.deepEqual(list.body.items.map((c) => c.code), ['FLAT50', 'FREESHIP', 'WELCOME10']);
    const flat50 = list.body.items.find((c) => c.code === 'FLAT50');
    const quoteFlat50 = () =>
      api().post('/api/cart/quote').send({ items: [{ productId: products['test-gadget'].id, qty: 2 }], coupon: 'FLAT50' });
    assert.equal((await quoteFlat50()).body.coupon.valid, true);
    const off = await asAdmin(api().patch(`/api/admin/coupons/${flat50.id}`)).send({ isActive: false });
    assert.equal(off.body.coupon.isActive, false);
    const quote = await quoteFlat50();
    assert.equal(quote.body.coupon.valid, false);
    assert.equal(quote.body.coupon.message, 'FLAT50 is no longer active.');
    await asAdmin(api().patch(`/api/admin/coupons/${flat50.id}`)).send({ isActive: true });
  });
});

describe('wishlist', () => {
  let token;
  const LITE_KEYS = ['_id', 'badges', 'category', 'colors', 'compareAtPrice', 'id', 'image', 'images', 'isActive', 'name', 'price', 'slug', 'stock', 'tagline'];
  const add = (slug) => api().post(`/api/wishlist/${products[slug].id}`).set(bearer(token));

  before(async () => {
    token = await register('wish@example.com');
  });

  it('requires auth', async () => {
    assertError(await api().get('/api/wishlist'), 401, 'UNAUTHENTICATED');
    assertError(await api().post(`/api/wishlist/${products['test-widget'].id}`), 401, 'UNAUTHENTICATED');
  });

  it('adds idempotently and returns lite products, newest first', async () => {
    const first = await add('test-widget');
    assert.equal(first.status, 200);
    assert.equal(first.body.items.length, 1);
    assert.deepEqual(Object.keys(first.body.items[0]).sort(), LITE_KEYS);
    assert.equal(first.body.items[0].image, first.body.items[0].images[0]);

    assert.equal((await add('test-widget')).body.items.length, 1);
    const both = await add('test-gadget');
    assert.deepEqual(both.body.items.map((p) => p.slug), ['test-gadget', 'test-widget']);
    assert.deepEqual((await api().get('/api/wishlist').set(bearer(token))).body.items.map((p) => p.slug), ['test-gadget', 'test-widget']);
  });

  it('404s for missing or inactive products', async () => {
    assertError(await add('test-hidden'), 404, 'PRODUCT_NOT_FOUND');
    assertError(await api().post(`/api/wishlist/${new mongoose.Types.ObjectId()}`).set(bearer(token)), 404, 'PRODUCT_NOT_FOUND');
    assertError(await api().post('/api/wishlist/nope').set(bearer(token)), 400, 'VALIDATION_ERROR');
  });

  it('removes items (idempotently)', async () => {
    const del = () => api().delete(`/api/wishlist/${products['test-widget'].id}`).set(bearer(token));
    assert.deepEqual((await del()).body.items.map((p) => p.slug), ['test-gadget']);
    const again = await del();
    assert.equal(again.status, 200);
    assert.deepEqual(again.body.items.map((p) => p.slug), ['test-gadget']);
  });

  it('merges a guest list as a union of active products', async () => {
    const res = await api()
      .post('/api/wishlist/merge')
      .set(bearer(token))
      .send({
        productIds: [
          products['test-widget'].id,
          products['test-gadget'].id,
          products['test-widget'].id,
          products['test-hidden'].id,
          new mongoose.Types.ObjectId().toString(),
        ],
      });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((p) => p.slug).sort(), ['test-gadget', 'test-widget']);

    const tooMany = Array.from({ length: 101 }, () => new mongoose.Types.ObjectId().toString());
    assertError(await api().post('/api/wishlist/merge').set(bearer(token)).send({ productIds: tooMany }), 400, 'VALIDATION_ERROR');
  });
});

describe('storefront features', () => {
  let adminToken;
  let buyerToken;
  let addressId;
  const asAdmin = (req) => req.set(bearer(adminToken));
  const asBuyer = (req) => req.set(bearer(buyerToken));
  const addToCart = (slug, qty) => asBuyer(api().post('/api/cart/items')).send({ productId: products[slug].id, qty });
  const checkout = (body = {}) => asBuyer(api().post('/api/orders/checkout')).send({ addressId, ...body });
  const setStatus = (id, status, note) => asAdmin(api().patch(`/api/admin/orders/${id}/status`)).send({ status, note });
  const productBySlug = async (slug) => (await api().get(`/api/products/${slug}`)).body.product;

  async function fillCart(lines) {
    await asBuyer(api().delete('/api/cart'));
    for (const [slug, qty] of lines) {
      const res = await addToCart(slug, qty);
      assert.equal(res.status, 200, JSON.stringify(res.body));
    }
  }

  async function payOnline(lines) {
    await fillCart(lines);
    const created = await checkout();
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const razorpayOrderId = created.body.razorpay.orderId;
    const paymentId = fakePaymentId();
    const verified = await asBuyer(api().post(`/api/orders/${created.body.order.id}/verify`)).send({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature(razorpayOrderId, paymentId),
    });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    return verified.body.order;
  }

  async function deliver(orderId) {
    const steps = ['processing', 'shipped', 'delivered'];
    const { status: current } = await Order.findById(orderId);
    let res;
    for (const status of steps.slice(steps.indexOf(current) + 1)) {
      res = await setStatus(orderId, status);
      assert.equal(res.status, 200, JSON.stringify(res.body));
    }
    return res.body.order;
  }

  before(async () => {
    adminToken = await register('feature-admin@example.com', 'Feature Admin');
    await User.updateOne({ email: 'feature-admin@example.com' }, { $set: { role: 'admin' } });
    buyerToken = await register('feature-buyer@example.com', 'Feature Buyer');
    const res = await asBuyer(api().post('/api/addresses')).send({
      fullName: 'Feature Buyer',
      phone: '9812345670',
      pincode: '600001',
      line1: '9 Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
    });
    addressId = res.body.address.id;
    await Promise.all([setStock('test-widget', 50), setStock('test-gadget', 50), setStock('test-scarce', 2), setStock('test-sold-out', 0)]);
  });

  describe('catalog filters and search suggestions', () => {
    const slugs = async (query) => (await api().get(`/api/products?${query}`)).body.items.map((p) => p.slug).sort();

    it('filters by inStock, onSale, minRating and badge', async () => {
      const inStock = await slugs('inStock=1');
      assert.ok(!inStock.includes('test-sold-out') && inStock.includes('test-widget'));
      assert.deepEqual(await slugs('onSale=1'), ['test-snack']);
      assert.deepEqual(await slugs('minRating=4.5'), ['test-gadget']);
      assert.deepEqual(await slugs('badge=bestseller'), ['test-scarce']);
      assert.deepEqual(await slugs('badge=new&inStock=1'), ['test-gadget']);
      assertError(await api().get('/api/products?badge=cheap'), 400, 'VALIDATION_ERROR');
    });

    it('suggests products by word prefix and matching categories', async () => {
      const suggest = (q) => api().get(`/api/products/suggest?q=${encodeURIComponent(q)}`);
      const wid = await suggest('wid');
      assert.equal(wid.status, 200);
      assert.deepEqual(wid.body.products.map((p) => p.slug), ['test-widget']);
      assert.deepEqual(Object.keys(wid.body.products[0]).sort(), ['category', 'image', 'name', 'price', 'slug']);
      assert.deepEqual(wid.body.categories, []);
      assert.equal(wid.body.query, 'wid');

      assert.deepEqual((await suggest('crunch')).body.products.map((p) => p.slug), ['test-snack']);
      const sna = await suggest('Sna');
      assert.deepEqual(sna.body.categories, ['snacks']);
      assert.ok(sna.body.products.some((p) => p.slug === 'test-snack'));
      assert.deepEqual((await suggest('idget')).body.products, []);
      assert.deepEqual((await suggest('hidden')).body.products, []);
      assert.deepEqual((await suggest('')).body, { products: [], categories: [], query: '' });
    });
  });

  describe('reviews', () => {
    let criticToken;
    let criticReviewId;
    let buyerReviewId;
    const reviewPath = (slug) => `/api/products/${slug}/reviews`;
    const body = (rating) => ({ rating, title: 'Does what it says', body: 'Sturdy, cheerful and exactly as pictured.' });

    before(async () => {
      criticToken = await register('critic@example.com', 'Carla Critic');
    });

    it('creates an unverified review and rejects a duplicate with 409', async () => {
      assertError(await api().post(reviewPath('test-widget')).send(body(4)), 401, 'UNAUTHENTICATED');
      assertError(await api().post(reviewPath('test-widget')).set(bearer(criticToken)).send(body(6)), 400, 'VALIDATION_ERROR');
      assertError(await api().post(reviewPath('test-hidden')).set(bearer(criticToken)).send(body(4)), 404, 'PRODUCT_NOT_FOUND');

      const res = await api().post(reviewPath('test-widget')).set(bearer(criticToken)).send(body(4));
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.review.verified, false);
      assert.deepEqual(res.body.review.user, { name: 'Carla Critic', avatarUrl: null });
      criticReviewId = res.body.review.id;

      assertError(await api().post(reviewPath('test-widget')).set(bearer(criticToken)).send(body(5)), 409, 'ALREADY_REVIEWED');
      const product = await productBySlug('test-widget');
      assert.equal(product.rating, 4);
      assert.equal(product.reviewCount, 1);
    });

    it('marks a buyer review as verified and recomputes the rating', async () => {
      const order = await payOnline([['test-widget', 1]]);
      const res = await asBuyer(api().post(reviewPath('test-widget'))).send(body(2));
      assert.equal(res.status, 201);
      assert.equal(res.body.review.verified, true);
      assert.equal(res.body.review.order, order.id);
      buyerReviewId = res.body.review.id;

      const product = await productBySlug('test-widget');
      assert.equal(product.rating, 3);
      assert.equal(product.reviewCount, 2);
    });

    it('lists reviews with breakdown, average and sorting', async () => {
      const res = await api().get(`${reviewPath('test-widget')}?sort=lowest`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.items.map((r) => r.rating), [2, 4]);
      assert.deepEqual(res.body.breakdown, { 5: 0, 4: 1, 3: 0, 2: 1, 1: 0 });
      assert.equal(res.body.average, 3);
      assert.equal(res.body.total, 2);
      assert.equal(res.body.pages, 1);
      assert.deepEqual(res.body.items[0].user, { name: 'Feature Buyer', avatarUrl: null });
      const highest = await api().get(`${reviewPath('test-widget')}?sort=highest`);
      assert.equal(highest.body.items[0].rating, 4);
    });

    it('lets owners edit and delete, forbids others, and lets admins moderate', async () => {
      const edited = await api().patch(`/api/reviews/${criticReviewId}`).set(bearer(criticToken)).send({ rating: 5 });
      assert.equal(edited.status, 200);
      assert.equal(edited.body.review.rating, 5);
      assert.equal((await productBySlug('test-widget')).rating, 3.5);
      assertError(await asBuyer(api().patch(`/api/reviews/${criticReviewId}`)).send({ rating: 1 }), 403, 'FORBIDDEN');

      const listed = await asAdmin(api().get('/api/admin/reviews'));
      const critic = listed.body.items.find((r) => r.id === criticReviewId);
      assert.equal(critic.product.slug, 'test-widget');
      assert.equal(critic.user.email, 'critic@example.com');
      assert.deepEqual(await (await asAdmin(api().delete(`/api/admin/reviews/${criticReviewId}`))).body, { ok: true });
      let product = await productBySlug('test-widget');
      assert.deepEqual([product.rating, product.reviewCount], [2, 1]);

      assert.deepEqual((await asBuyer(api().delete(`/api/reviews/${buyerReviewId}`))).body, { ok: true });
      product = await productBySlug('test-widget');
      assert.deepEqual([product.rating, product.reviewCount], [0, 0]);
      assertError(await asBuyer(api().delete(`/api/reviews/${buyerReviewId}`)), 404, 'REVIEW_NOT_FOUND');
    });
  });

  describe('cash on delivery', () => {
    let codOrder;

    it('places a COD order with the ₹30 fee, reserving stock immediately', async () => {
      await fillCart([['test-widget', 2]]);
      const stockBefore = await stockOf('test-widget');
      const res = await checkout({ paymentMethod: 'cod', deliveryNote: 'Leave it with the guard', giftMessage: 'Happy birthday, Meera!' });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.razorpay, undefined);
      codOrder = res.body.order;
      // 2 x 15000 + 4900 shipping + 3000 COD fee
      assert.deepEqual(
        [codOrder.subtotal, codOrder.shipping, codOrder.codFee, codOrder.total],
        [30000, 4900, 3000, 37900],
      );
      assert.equal(codOrder.status, 'processing');
      assert.equal(codOrder.paymentMethod, 'cod');
      assert.deepEqual([codOrder.payment.provider, codOrder.payment.method], ['cod', 'cod']);
      assert.equal(codOrder.deliveryNote, 'Leave it with the guard');
      assert.equal(codOrder.giftMessage, 'Happy birthday, Meera!');
      assert.equal(await stockOf('test-widget'), stockBefore - 2);
      assert.deepEqual((await asBuyer(api().get('/api/cart'))).body.cart.items, []);
    });

    it('caps COD orders at ₹5,000 and validates the notes', async () => {
      await fillCart([['test-gadget', 10], ['test-widget', 10]]);
      const res = await checkout({ paymentMethod: 'cod' });
      assertError(res, 400, 'COD_LIMIT_EXCEEDED');
      assert.equal(res.body.error.details.maxTotal, 500000);
      assertError(await checkout({ paymentMethod: 'cod', giftMessage: 'x'.repeat(201) }), 400, 'VALIDATION_ERROR');
      assertError(await checkout({ paymentMethod: 'cheque' }), 400, 'VALIDATION_ERROR');
    });

    it('collects payment on delivery, and cancelling a COD order restores stock without a refund', async () => {
      const delivered = await deliver(codOrder.id);
      assert.ok(delivered.payment.paidAt);
      assert.ok(delivered.deliveredAt);

      await fillCart([['test-widget', 1]]);
      const second = (await checkout({ paymentMethod: 'cod' })).body.order;
      const stockBefore = await stockOf('test-widget');
      const cancelled = await asBuyer(api().post(`/api/orders/${second.id}/cancel`));
      assert.equal(cancelled.body.order.status, 'cancelled');
      assert.equal(cancelled.body.order.payment.refundStatus, undefined);
      assert.equal(await stockOf('test-widget'), stockBefore + 1);

      const filtered = await asAdmin(api().get('/api/admin/orders?paymentMethod=cod'));
      assert.ok(filtered.body.total >= 2);
      assert.ok(filtered.body.items.every((o) => o.paymentMethod === 'cod'));
      const stats = await asAdmin(api().get('/api/admin/stats'));
      assert.ok(stats.body.codOrders >= 2);
    });

    it('declines and approves returns for COD orders (manual refund)', async () => {
      const requested = await asBuyer(api().post(`/api/orders/${codOrder.id}/return`)).send({ reason: 'changed_mind' });
      assert.equal(requested.body.order.status, 'return_requested');
      const declined = await setStatus(codOrder.id, 'delivered', 'Item was opened and used');
      assert.equal(declined.body.order.status, 'delivered');
      assert.equal(declined.body.order.timeline.at(-1).note, 'Item was opened and used');
      assert.ok(declined.body.order.return.resolvedAt);

      await asBuyer(api().post(`/api/orders/${codOrder.id}/return`)).send({ reason: 'damaged' });
      const approved = await setStatus(codOrder.id, 'returned');
      assert.equal(approved.body.order.status, 'returned');
      assert.equal(approved.body.order.payment.refundStatus, 'manual');
    });
  });

  describe('returns', () => {
    it('only allows returns on delivered orders, and admin approval refunds online payments', async () => {
      const order = await payOnline([['test-gadget', 1]]);
      assertError(await asBuyer(api().post(`/api/orders/${order.id}/return`)).send({ reason: 'damaged' }), 409, 'RETURN_NOT_ALLOWED');
      await deliver(order.id);
      assertError(await asBuyer(api().post(`/api/orders/${order.id}/return`)).send({ reason: 'bored' }), 400, 'VALIDATION_ERROR');

      const res = await asBuyer(api().post(`/api/orders/${order.id}/return`)).send({ reason: 'damaged', note: 'Arrived cracked' });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.order.status, 'return_requested');
      assert.equal(res.body.order.return.reason, 'damaged');
      assert.equal(res.body.order.return.note, 'Arrived cracked');
      assert.ok(res.body.order.return.requestedAt);
      assert.ok((await asAdmin(api().get('/api/admin/stats'))).body.returnsPending >= 1);

      assertError(await setStatus(order.id, 'shipped'), 409, 'INVALID_TRANSITION');
      const approved = await setStatus(order.id, 'returned');
      assert.equal(approved.body.order.status, 'returned');
      assert.ok(approved.body.order.return.resolvedAt);
      assert.ok(['pending', 'processed', 'failed'].includes(approved.body.order.payment.refundStatus));
    });

    it('closes the return window 7 days after delivery', async () => {
      const order = await payOnline([['test-widget', 1]]);
      await deliver(order.id);
      await Order.updateOne({ _id: order.id }, { $set: { deliveredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });
      assertError(await asBuyer(api().post(`/api/orders/${order.id}/return`)).send({ reason: 'other' }), 409, 'RETURN_WINDOW_CLOSED');
    });
  });

  describe('reorder and invoice', () => {
    it('re-adds available items, capping quantities and listing what was skipped', async () => {
      const order = await payOnline([['test-widget', 2], ['test-snack', 1], ['test-scarce', 1]]);
      await setStock('test-scarce', 0);
      await Product.updateOne({ slug: 'test-snack' }, { $set: { isActive: false } });
      await addToCart('test-widget', 9);

      const res = await asBuyer(api().post(`/api/orders/${order.id}/reorder`));
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.deepEqual(res.body.cart.items.map((item) => [item.product.slug, item.qty]), [['test-widget', 10]]);
      const skipped = Object.fromEntries(res.body.skipped.map((s) => [s.name, s.reason]));
      assert.deepEqual(skipped, { 'Test Widget': 'max_qty', 'Test Snack Crunch': 'unavailable', 'Test Scarce': 'out_of_stock' });

      await Product.updateOne({ slug: 'test-snack' }, { $set: { isActive: true } });
      await setStock('test-scarce', 2);
    });

    it('returns invoice data for paid orders only', async () => {
      const paid = await payOnline([['test-gadget', 1]]);
      const res = await asBuyer(api().get(`/api/orders/${paid.id}/invoice`));
      assert.equal(res.status, 200);
      assert.equal(res.body.invoiceNumber, `INV-${paid.orderNumber}`);
      assert.deepEqual(Object.keys(res.body.seller).sort(), ['address', 'email', 'gstin', 'name']);
      assert.equal(res.body.seller.gstin, '(not registered)');
      assert.equal(res.body.order.id, paid.id);
      assert.equal(new Date(res.body.issuedAt).getTime(), new Date(paid.payment.paidAt).getTime());

      await fillCart([['test-widget', 1]]);
      const pending = (await checkout()).body.order;
      assertError(await asBuyer(api().get(`/api/orders/${pending.id}/invoice`)), 409, 'INVOICE_UNAVAILABLE');
      await asBuyer(api().post(`/api/orders/${pending.id}/cancel`));
    });
  });

  describe('password reset', () => {
    async function captureMail(action) {
      const lines = [];
      const quiet = console.info;
      console.info = (...args) => lines.push(args.join(' '));
      try {
        const res = await action();
        return { res, mail: lines.join('\n') };
      } finally {
        console.info = quiet;
      }
    }
    const forgot = (email) => captureMail(() => api().post('/api/auth/forgot-password').send({ email }));
    const tokenFrom = (mail) => mail.match(/reset-password\?token=([0-9a-f]{64})/)?.[1];
    const reset = (token, password = 'Brand-New-123') => api().post('/api/auth/reset-password').send({ token, password });

    before(async () => {
      await register('forgetful@example.com', 'Forgetful Fran');
    });

    it('emails a single-use link and resets the password', async () => {
      const { res, mail } = await forgot('Forgetful@Example.com');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { ok: true });
      assert.ok(mail.includes(`${config.APP_URL}/reset-password?token=`));
      const token = tokenFrom(mail);
      assert.ok(token);

      assert.deepEqual((await reset(token)).body, { ok: true });
      assert.equal((await api().post('/api/auth/login').send({ email: 'forgetful@example.com', password: 'Brand-New-123' })).status, 200);
      assertError(await reset(token), 400, 'INVALID_TOKEN');
    });

    it('always answers ok, and rejects bad, superseded and expired tokens', async () => {
      const unknown = await forgot('nobody@example.com');
      assert.deepEqual(unknown.res.body, { ok: true });
      assert.equal(unknown.mail, '');
      assertError(await reset('not-a-real-token'), 400, 'INVALID_TOKEN');
      assertError(await reset('a'.repeat(64), 'short'), 400, 'VALIDATION_ERROR');

      const first = tokenFrom((await forgot('forgetful@example.com')).mail);
      const second = tokenFrom((await forgot('forgetful@example.com')).mail);
      assertError(await reset(first), 400, 'INVALID_TOKEN');

      await mongoose.model('PasswordReset').updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      assertError(await reset(second), 400, 'INVALID_TOKEN');
    });
  });

  describe('account deletion', () => {
    it('requires the password, anonymises the user and their orders, and removes personal data', async () => {
      const token = await register('leaver@example.com', 'Lena Leaver');
      const auth = (req) => req.set(bearer(token));
      const address = await auth(api().post('/api/addresses')).send({
        fullName: 'Lena Leaver',
        phone: '9000012345',
        pincode: '700001',
        line1: '3 Park Street',
        city: 'Kolkata',
        state: 'West Bengal',
      });
      await auth(api().post('/api/cart/items')).send({ productId: products['test-widget'].id, qty: 1 });
      const order = (await auth(api().post('/api/orders/checkout')).send({ addressId: address.body.address.id, paymentMethod: 'cod', giftMessage: 'For Lena' })).body.order;
      await auth(api().post(`/api/wishlist/${products['test-gadget'].id}`));
      await auth(api().post('/api/cart/items')).send({ productId: products['test-gadget'].id, qty: 1 });
      await api().post('/api/newsletter').send({ email: 'leaver@example.com' });
      const { _id: userId } = await User.findOne({ email: 'leaver@example.com' });

      assertError(await auth(api().delete('/api/auth/me')).send({}), 400, 'PASSWORD_REQUIRED');
      assertError(await auth(api().delete('/api/auth/me')).send({ password: 'wrong-password' }), 400, 'INVALID_PASSWORD');
      const res = await auth(api().delete('/api/auth/me')).send({ password: PASSWORD });
      assert.deepEqual(res.body, { ok: true });
      assert.ok(res.headers['set-cookie'].some((c) => c.startsWith('sk_token=;')));

      assertError(await auth(api().get('/api/auth/me')), 401, 'SESSION_EXPIRED');
      assertError(await api().post('/api/auth/login').send({ email: 'leaver@example.com', password: PASSWORD }), 401, 'INVALID_CREDENTIALS');

      const user = await User.findById(userId);
      assert.equal(user.name, 'Deleted user');
      assert.equal(user.email, `deleted+${userId}@shopkart.invalid`);
      assert.equal(user.passwordHash, undefined);
      assert.ok(user.deletedAt);
      for (const model of ['Cart', 'Wishlist', 'Address']) {
        assert.equal(await mongoose.model(model).countDocuments({ user: userId }), 0, model);
      }
      assert.equal(await mongoose.model('Subscriber').countDocuments({ email: 'leaver@example.com' }), 0);

      const kept = await Order.findById(order.id);
      assert.equal(kept.address.fullName, 'Deleted user');
      assert.equal(kept.address.line1, 'Removed');
      assert.equal(kept.giftMessage, undefined);
      assert.equal(kept.total, order.total);

      assert.equal((await api().post('/api/auth/register').send({ name: 'Lena Again', email: 'leaver@example.com', password: PASSWORD })).status, 201);
    });
  });

  describe('alerts, newsletter and contact', () => {
    it('records back-in-stock alerts idempotently and sends them when restocked', async () => {
      const notify = (body, token) => {
        const req = api().post('/api/products/test-sold-out/notify');
        return (token ? req.set(bearer(token)) : req).send(body);
      };
      assert.equal((await notify({ email: 'Fan@Example.com' })).status, 201);
      assert.equal((await notify({ email: 'fan@example.com' })).status, 200);
      assertError(await notify({}), 400, 'VALIDATION_ERROR');
      assert.equal((await notify({}, buyerToken)).status, 201);
      assertError(await api().post('/api/products/test-hidden/notify').send({ email: 'fan@example.com' }), 404, 'PRODUCT_NOT_FOUND');

      const alerts = mongoose.model('StockAlert');
      const productId = products['test-sold-out']._id;
      assert.deepEqual((await alerts.find({ product: productId }).sort({ email: 1 })).map((a) => a.email), ['fan@example.com', 'feature-buyer@example.com']);

      const lines = [];
      const quiet = console.info;
      console.info = (...args) => lines.push(args.join(' '));
      try {
        const res = await asAdmin(api().patch(`/api/admin/products/${productId}`)).send({ stock: 5 });
        assert.equal(res.status, 200);
      } finally {
        console.info = quiet;
      }
      assert.equal(await alerts.countDocuments({ product: productId, notifiedAt: null }), 0);
      assert.equal(lines.filter((line) => line.includes('Test Sold Out is back in stock')).length, 2);
      await setStock('test-sold-out', 0);
    });

    it('subscribes to the newsletter idempotently', async () => {
      assert.equal((await api().post('/api/newsletter').send({ email: 'News@Example.com' })).status, 201);
      const again = await api().post('/api/newsletter').send({ email: 'news@example.com' });
      assert.equal(again.status, 200);
      assert.deepEqual(again.body, { ok: true });
      assertError(await api().post('/api/newsletter').send({ email: 'not-an-email' }), 400, 'VALIDATION_ERROR');
      const subscribers = await asAdmin(api().get('/api/admin/subscribers'));
      assert.ok(subscribers.body.items.some((s) => s.email === 'news@example.com'));
      assert.equal(typeof subscribers.body.total, 'number');
    });

    it('stores contact messages for the admin inbox', async () => {
      const message = { name: 'Riya', email: 'riya@example.com', subject: 'Bulk order', message: 'Can I order 50 pins for a team event?' };
      const res = await api().post('/api/contact').send(message);
      assert.equal(res.status, 201);
      assert.deepEqual(res.body, { ok: true });
      assertError(await api().post('/api/contact').send({ ...message, message: 'Hi' }), 400, 'VALIDATION_ERROR');
      const inbox = await asAdmin(api().get('/api/admin/messages'));
      assert.equal(inbox.body.items[0].subject, 'Bulk order');
      assertError(await asBuyer(api().get('/api/admin/messages')), 403, 'FORBIDDEN');
    });
  });
});

describe('seed', () => {
  it('seeds the catalogue idempotently with the documented invariants', async () => {
    await seedCatalog();
    await seedCatalog();
    await seedUsers();
    assert.equal(await seedReviews(), 45);
    assert.equal(await seedReviews(), 45);
    const seeded = await Product.find({ slug: { $not: /^test-/ } });
    assert.equal(seeded.length, 24);
    const perCategory = Object.groupBy(seeded, (p) => p.category);
    assert.equal(Object.keys(perCategory).length, 6);
    assert.ok(Object.values(perCategory).every((list) => list.length === 4));
    assert.ok(seeded.every((p) => p.price >= 4900 && p.price <= 79900 && Number.isInteger(p.price)));
    assert.ok(seeded.every((p) => p.images.length === 2));
    assert.equal(new Set(seeded.map((p) => p.images[0])).size, seeded.length, 'primary images must be unique');
    assert.equal(seeded.filter((p) => p.stock === 0).length, 1);
    assert.equal(seeded.filter((p) => p.stock > 0 && p.stock <= 3).length, 2);
    const onSale = seeded.filter((p) => p.compareAtPrice);
    assert.ok(onSale.length >= 4);
    assert.ok(onSale.every((p) => p.compareAtPrice >= p.price * 1.15 && p.compareAtPrice <= p.price * 1.3));
    const reviewed = seeded.filter((p) => p.reviewCount > 0);
    assert.equal(reviewed.length, 17);
    assert.equal(reviewed.reduce((sum, p) => sum + p.reviewCount, 0), 45);
    assert.ok(reviewed.every((p) => p.rating >= 1 && p.rating <= 5 && Math.round(p.rating * 10) === p.rating * 10));
    assert.ok(seeded.filter((p) => p.reviewCount === 0).every((p) => p.rating === 0));
    assert.equal(await mongoose.model('Coupon').countDocuments({ code: 'FLAT5' }), 0);
    assert.equal(await User.countDocuments({ email: /^reviewer[1-6]@shopkart\.dev$/ }), 6);
    assert.equal((await User.findOne({ email: 'test@gmail.com' })).role, 'admin');
    const badgeCount = (badge) => seeded.filter((p) => p.badges.includes(badge)).length;
    assert.ok(badgeCount('bestseller') <= 8 && badgeCount('new') <= 6 && badgeCount('limited') <= 4);
  });
});
