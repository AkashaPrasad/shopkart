import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { config } from './config.js';
import { COUPONS, PRODUCTS, RETIRED_COUPONS, USERS } from './data/catalog.js';
import { REVIEWERS, REVIEWS } from './data/reviews.js';
import { Cart } from './models/Cart.js';
import { Coupon } from './models/Coupon.js';
import { Product } from './models/Product.js';
import { Review } from './models/Review.js';
import { User } from './models/User.js';
import { recomputeProductRating } from './services/reviews.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Optional product fields: removed on re-seed when a product no longer defines them.
const OPTIONAL_PRODUCT_FIELDS = ['compareAtPrice', 'colors'];

/** Upserts every product by slug. Re-running resets catalogue fields (including stock). */
export async function seedProducts() {
  const now = Date.now();
  const result = await Product.bulkWrite(
    PRODUCTS.map(({ daysAgo, ...product }) => ({
      updateOne: {
        filter: { slug: product.slug },
        update: {
          $set: { ...product, isActive: true, updatedAt: new Date(now) },
          $setOnInsert: { createdAt: new Date(now - daysAgo * DAY_MS) },
          $unset: Object.fromEntries(OPTIONAL_PRODUCT_FIELDS.filter((key) => !(key in product)).map((key) => [key, 1])),
        },
        upsert: true,
        timestamps: false,
      },
    })),
  );
  return { inserted: result.upsertedCount, updated: result.modifiedCount };
}

export async function seedCoupons() {
  await Coupon.deleteMany({ code: { $in: RETIRED_COUPONS } });
  await Cart.updateMany({ coupon: { $in: RETIRED_COUPONS } }, { $set: { coupon: null } });
  await Coupon.bulkWrite(
    COUPONS.map((coupon) => ({
      updateOne: { filter: { code: coupon.code }, update: { $set: coupon }, upsert: true },
    })),
  );
}

export async function seedCatalog() {
  const products = await seedProducts();
  await seedCoupons();
  return products;
}

/** Upserts the demo accounts and reviewers by email and (re)sets their passwords. */
export async function seedUsers() {
  for (const { password, ...fields } of [...USERS, ...REVIEWERS]) {
    const user = (await User.findOne({ email: fields.email })) ?? new User();
    user.set(fields);
    await user.setPassword(password);
    await user.save();
  }
}

/** Upserts one review per (reviewer, product), then recomputes every product's rating. */
export async function seedReviews() {
  const emails = [...new Set(Object.values(REVIEWS).flatMap((list) => list.map((r) => r.email)))];
  const users = await User.find({ email: { $in: emails } }).select('_id email');
  const userIds = new Map(users.map((user) => [user.email, user._id]));
  const products = await Product.find({ slug: { $in: PRODUCTS.map((p) => p.slug) } }).select('_id slug');
  const productIds = new Map(products.map((product) => [product.slug, product._id]));

  const now = Date.now();
  const ops = Object.entries(REVIEWS).flatMap(([slug, list]) =>
    list.map(({ email, rating, title, body }, index) => ({
      updateOne: {
        filter: { user: userIds.get(email), product: productIds.get(slug) },
        update: {
          $set: { rating, title, body },
          $setOnInsert: { verified: false, createdAt: new Date(now - (index * 9 + 3) * DAY_MS), updatedAt: new Date(now) },
        },
        upsert: true,
        timestamps: false,
      },
    })),
  );
  if (ops.some((op) => !op.updateOne.filter.user || !op.updateOne.filter.product)) {
    throw new Error('seedReviews needs seedUsers and seedProducts to run first');
  }
  await Review.bulkWrite(ops);
  for (const product of products) await recomputeProductRating(product._id);
  return ops.length;
}

async function main() {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  await mongoose.connection.syncIndexes();
  const products = await seedCatalog();
  await seedUsers();
  const reviews = await seedReviews();
  console.log(
    `Seeded ${PRODUCTS.length} products (${products.inserted} new, ${products.updated} updated), ` +
      `${COUPONS.length} coupons, ${USERS.length + REVIEWERS.length} users and ${reviews} reviews into "${mongoose.connection.name}".`,
  );
  await mongoose.disconnect();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
