import { Product } from '../models/Product.js';
import { Wishlist } from '../models/Wishlist.js';
import { toLiteProduct } from '../services/cart.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_WISHLIST_ITEMS = 100;

const getOrCreate = (userId) =>
  Wishlist.findOneAndUpdate({ user: userId }, { $setOnInsert: { products: [] } }, { upsert: true, returnDocument: 'after' });

/** Newest first; products deleted from the catalogue simply drop out. */
async function sendItems(res, wishlist) {
  await wishlist.populate('products');
  const items = wishlist.products.filter(Boolean).map(toLiteProduct).reverse();
  res.json({ items });
}

const hasProduct = (wishlist, productId) => wishlist.products.some((id) => id.toString() === productId);

export async function getWishlist(req, res) {
  await sendItems(res, await getOrCreate(req.user._id));
}

export async function addToWishlist(req, res) {
  const { productId } = req.params;
  const product = await Product.exists({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('PRODUCT_NOT_FOUND', 'That product is no longer available.');

  const wishlist = await getOrCreate(req.user._id);
  if (!hasProduct(wishlist, productId)) {
    if (wishlist.products.length >= MAX_WISHLIST_ITEMS) {
      throw ApiError.badRequest('WISHLIST_FULL', `Your wishlist can hold up to ${MAX_WISHLIST_ITEMS} items.`);
    }
    wishlist.products.push(productId);
    await wishlist.save();
  }
  await sendItems(res, wishlist);
}

export async function removeFromWishlist(req, res) {
  const { productId } = req.params;
  const wishlist = await getOrCreate(req.user._id);
  if (hasProduct(wishlist, productId)) {
    wishlist.products = wishlist.products.filter((id) => id.toString() !== productId);
    await wishlist.save();
  }
  await sendItems(res, wishlist);
}

/** Union of the guest list and the saved one (existing items first), capped at 100. */
export async function mergeWishlist(req, res) {
  const wishlist = await getOrCreate(req.user._id);
  const incoming = [...new Set(req.body.productIds)].filter((id) => !hasProduct(wishlist, id));
  const active = await Product.find({ _id: { $in: incoming }, isActive: true }).select('_id');
  const activeIds = new Set(active.map((p) => p._id.toString()));
  const additions = incoming.filter((id) => activeIds.has(id)).slice(0, MAX_WISHLIST_ITEMS - wishlist.products.length);
  if (additions.length) {
    wishlist.products.push(...additions);
    await wishlist.save();
  }
  await sendItems(res, wishlist);
}
