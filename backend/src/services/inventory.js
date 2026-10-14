import { Product } from '../models/Product.js';
import { MAX_QTY_PER_ITEM } from './pricing.js';

/**
 * Explains why a product can't be bought at `qty`, or returns null when it can.
 * `product` may be null (deleted) or inactive.
 */
export function lineIssue(product, qty) {
  if (!product || !product.isActive) {
    return { reason: 'unavailable', message: 'This item is no longer available.' };
  }
  if (product.stock <= 0) return { reason: 'out_of_stock', message: 'Sold out for now.' };
  if (qty > product.stock) {
    return { reason: 'insufficient_stock', message: `Only ${product.stock} left in stock.` };
  }
  if (qty > MAX_QTY_PER_ITEM) {
    return { reason: 'max_qty', message: `You can buy up to ${MAX_QTY_PER_ITEM} of each item.` };
  }
  return null;
}

/** Shape used in 409 `details.issues` everywhere stock is enforced. */
export function stockIssue(product, productId, qty, issue) {
  return {
    productId: String(productId),
    slug: product?.slug ?? null,
    name: product?.name ?? null,
    reason: issue.reason,
    message: issue.message,
    requestedQty: qty,
    availableQty: product?.isActive ? Math.min(product.stock, MAX_QTY_PER_ITEM) : 0,
  };
}

/** Checks [{ productId, qty }] against the live catalogue. */
export async function findStockIssues(lines) {
  const products = await Product.find({ _id: { $in: lines.map((line) => line.productId) } });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  return lines.flatMap(({ productId, qty }) => {
    const product = byId.get(String(productId)) ?? null;
    const issue = lineIssue(product, qty);
    return issue ? [stockIssue(product, productId, qty, issue)] : [];
  });
}

export async function restoreStock(items) {
  if (!items.length) return;
  await Product.bulkWrite(
    items.map((item) => ({
      updateOne: { filter: { _id: item.product }, update: { $inc: { stock: item.qty } } },
    })),
  );
}

/**
 * Atomically subtracts each line's qty, only while enough stock remains.
 * All-or-nothing: if any line can't be covered, earlier decrements are undone.
 */
export async function deductStock(items) {
  const applied = [];
  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } },
      { returnDocument: 'after', projection: { _id: 1 } },
    );
    if (!updated) {
      await restoreStock(applied);
      return { ok: false, failedItem: item };
    }
    applied.push(item);
  }
  return { ok: true };
}
