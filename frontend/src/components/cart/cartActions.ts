import { useCallback } from 'react'
import { toast } from 'sonner'
import { useCart } from '@/store/cart'
import { errorMessage } from '@/lib/api'
import type { CartItem, CartProduct } from '@/types'

export const MAX_QTY = 10

/** Cart lines carry a single `image` from the server; products passed in from the catalogue carry `images[]`. */
export function productImage(p: Pick<CartProduct, 'image' | 'images'>): string | undefined {
  return p.images?.[0] ?? p.image ?? undefined
}

/** True once the cart has loaded at least once (avoids an empty-cart flash before the first sync). */
export function useCartHydrated() {
  const loading = useCart(s => s.loading)
  const loaded = useCart(s => s.loaded)
  const hasItems = useCart(s => s.cart.items.length > 0)
  return hasItems || (loaded && !loading)
}

export type LineIssue = { kind: 'soldout' | 'unavailable' | 'overstock'; message: string; fixQty?: number }

/** Lines that block checkout: unavailable products, sold out, or more requested than in stock / the per-item cap. */
export function lineIssue(item: CartItem): LineIssue | null {
  const { stock, isActive } = item.product
  if (isActive === false) return { kind: 'unavailable', message: 'No longer available. Remove it to check out.' }
  if (stock <= 0) return { kind: 'soldout', message: 'Sold out for now. Remove it to check out.' }
  const cap = Math.min(stock, MAX_QTY)
  if (item.qty > cap) return { kind: 'overstock', message: stock < item.qty ? `Only ${stock} left. Lower the quantity to continue.` : `Max ${MAX_QTY} per item. Lower the quantity to continue.`, fixQty: cap }
  if (item.available === false) return { kind: 'unavailable', message: 'No longer available. Remove it to check out.' }
  return null
}

export function maxQtyFor(item: CartItem) {
  return Math.max(1, Math.min(MAX_QTY, item.maxQty ?? MAX_QTY, item.product.stock))
}

/** Quantity change + remove-with-undo, with error toasts. Shared by the mini cart and the cart page. */
export function useLineActions() {
  const setQty = useCart(s => s.setQty)
  const remove = useCart(s => s.remove)
  const add = useCart(s => s.add)

  const changeQty = useCallback(async (item: CartItem, qty: number) => {
    try {
      await setQty(item.product._id, qty, item.color)
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t update the quantity. Try again.'))
    }
  }, [setQty])

  const removeLine = useCallback(async (item: CartItem) => {
    try {
      const removed = (await remove(item.product._id)) ?? item
      toast(`Removed ${removed.product.name}`, {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            const qty = removed.product.stock > 0 ? Math.min(removed.qty, removed.product.stock) : removed.qty
            add(removed.product, qty, removed.color ?? null)
              .then(() => toast.success(`${removed.product.name} is back in your cart`))
              .catch((e: unknown) => toast.error(errorMessage(e, 'Couldn’t put that back. Try adding it again.')))
          },
        },
      })
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t remove that item. Try again.'))
    }
  }, [remove, add])

  return { changeQty, removeLine }
}
