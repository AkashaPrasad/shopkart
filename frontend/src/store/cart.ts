import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Cart, CartItem, CartProduct, CouponState, ProductLite } from '@/types'

/**
 * Cart store. Guests keep items client-side (localStorage) and totals come from POST /cart/quote (server truth).
 * Authed users use the server cart. On login we merge the guest cart into the server cart.
 */
const GUEST_KEY = 'sk_guest_cart'
interface GuestLine { productId: string; qty: number; color?: string | null; product: CartProduct }

type QuoteResponse = { summary: Cart['summary']; items: CartItem[]; coupon?: string | CouponState | null; couponError?: string }
/** Backend returns coupon as a string (server cart) or {code, valid, message} (quote). Normalise to a code string + error. */
function normaliseCoupon(c: string | CouponState | null | undefined, fallbackError?: string): { coupon: string | null; couponError: string | null } {
  if (!c) return { coupon: null, couponError: fallbackError ?? null }
  if (typeof c === 'string') return { coupon: c, couponError: fallbackError ?? null }
  return c.valid ? { coupon: c.code, couponError: null } : { coupon: null, couponError: c.message ?? fallbackError ?? 'That coupon can’t be applied.' }
}
function toCart(r: QuoteResponse | Cart): Cart {
  const { coupon, couponError } = normaliseCoupon((r as QuoteResponse).coupon, (r as QuoteResponse).couponError)
  return { items: (r.items ?? []).filter(i => i.product), coupon, couponError, summary: r.summary }
}

const emptySummary = { subtotal: 0, discount: 0, shipping: 0, total: 0, freeShippingThreshold: 7900, amountToFreeShipping: 7900, itemCount: 0 }
const emptyCart: Cart = { items: [], coupon: null, summary: emptySummary }

function readGuest(): { lines: GuestLine[]; coupon: string | null } {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (!raw) return { lines: [], coupon: null }
    const parsed = JSON.parse(raw)
    return { lines: Array.isArray(parsed.lines) ? parsed.lines : [], coupon: parsed.coupon ?? null }
  } catch { return { lines: [], coupon: null } }
}
function writeGuest(lines: GuestLine[], coupon: string | null) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify({ lines, coupon })) } catch { /* noop */ }
}

interface CartState {
  cart: Cart
  mode: 'guest' | 'server'
  loading: boolean
  /** true after the first successful sync, so pages can avoid an empty-cart flash */
  loaded: boolean
  pending: Record<string, boolean>
  drawerOpen: boolean
  lastAdded: CartItem | null
  /** Timestamp of the last successful add(); drives the "Added to cart" card. */
  lastAddedAt: number
  openDrawer: () => void
  closeDrawer: () => void
  /** Call once on app boot and again whenever auth user changes. */
  sync: (isAuthed: boolean) => Promise<void>
  add: (product: ProductLite | CartProduct, qty?: number, color?: string | null) => Promise<void>
  setQty: (productId: string, qty: number, color?: string | null) => Promise<void>
  remove: (productId: string) => Promise<CartItem | undefined>
  clear: () => Promise<void>
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
  refresh: () => Promise<void>
}

const MAX_QTY = 10

export const useCart = create<CartState>((set, get) => {
  async function quoteGuest(lines: GuestLine[], coupon: string | null): Promise<Cart> {
    if (lines.length === 0) return { ...emptyCart, coupon }
    try {
      const r = await api.post<QuoteResponse>('/cart/quote', {
        items: lines.map(l => ({ productId: l.productId, qty: l.qty, color: l.color ?? undefined })),
        coupon: coupon ?? undefined,
      })
      // Purge lines whose product no longer exists so they can't linger in localStorage.
      const dead = new Set((r.items ?? []).filter(i => !i.product).map(i => i.productId))
      if (dead.size) writeGuest(lines.filter(l => !dead.has(l.productId)), coupon)
      const cart = toCart(r)
      // A coupon the server rejected should not stay persisted for guests.
      if (coupon && !cart.coupon) writeGuest(lines.filter(l => !dead.has(l.productId)), null)
      return cart
    } catch {
      // Offline fallback: compute locally from cached product data so the UI still works.
      const items: CartItem[] = lines.map(l => ({ product: l.product, qty: l.qty, color: l.color, lineTotal: l.product.price * l.qty }))
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
      const shipping = subtotal >= 7900 || subtotal === 0 ? 0 : 900
      return { items, coupon, summary: { subtotal, discount: 0, shipping, total: subtotal + shipping, freeShippingThreshold: 7900, amountToFreeShipping: Math.max(0, 7900 - subtotal), itemCount: items.reduce((s, i) => s + i.qty, 0) } }
    }
  }

  function setPending(id: string, v: boolean) {
    set(s => ({ pending: { ...s.pending, [id]: v } }))
  }

  return {
    cart: emptyCart,
    mode: 'guest',
    loading: false,
    loaded: false,
    pending: {},
    drawerOpen: false,
    lastAdded: null,
    lastAddedAt: 0,
    openDrawer: () => set({ drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false }),

    async sync(isAuthed) {
      set({ loading: true })
      try {
        if (isAuthed) {
          const g = readGuest()
          if (g.lines.length > 0) {
            const merged = await api.post<{ cart: Cart }>('/cart/merge', { items: g.lines.map(l => ({ productId: l.productId, qty: l.qty, color: l.color ?? undefined })) })
            writeGuest([], null)
            if (g.coupon) { try { const r = await api.post<{ cart: Cart }>('/cart/coupon', { code: g.coupon }); set({ cart: toCart(r.cart), mode: 'server' }); return } catch { /* coupon no longer valid */ } }
            set({ cart: toCart(merged.cart), mode: 'server' })
          } else {
            const r = await api.get<{ cart: Cart }>('/cart')
            const cart = toCart(r.cart)
            set({ cart, mode: 'server' })
          }
        } else {
          const g = readGuest()
          set({ cart: await quoteGuest(g.lines, g.coupon), mode: 'guest' })
        }
      } finally { set({ loading: false, loaded: true }) }
    },

    async refresh() {
      if (get().mode === 'server') {
        const r = await api.get<{ cart: Cart }>('/cart')
        const cart = toCart(r.cart)
        set({ cart })
      } else {
        const g = readGuest()
        set({ cart: await quoteGuest(g.lines, g.coupon) })
      }
    },

    async add(product, qty = 1, color = null) {
      setPending(product._id, true)
      try {
        if (get().mode === 'server') {
          const r = await api.post<{ cart: Cart }>('/cart/items', { productId: product._id, qty, color: color ?? undefined })
          const cart = toCart(r.cart)
          set({ cart, lastAdded: cart.items.find(i => i.product._id === product._id) ?? null, lastAddedAt: Date.now() })
        } else {
          const g = readGuest()
          const existing = g.lines.find(l => l.productId === product._id)
          const nextQty = Math.min(MAX_QTY, product.stock, (existing?.qty ?? 0) + qty)
          if (nextQty <= 0) throw new Error('This item is out of stock.')
          if (existing && existing.qty === nextQty) throw new Error(nextQty >= MAX_QTY ? `You can only buy ${MAX_QTY} of this item.` : `Only ${product.stock} left in stock.`)
          const lines = existing
            ? g.lines.map(l => l.productId === product._id ? { ...l, qty: nextQty, color: color ?? l.color, product } : l)
            : [...g.lines, { productId: product._id, qty: nextQty, color, product }]
          writeGuest(lines, g.coupon)
          const cart = await quoteGuest(lines, g.coupon)
          set({ cart, lastAdded: cart.items.find(i => i.product._id === product._id) ?? null, lastAddedAt: Date.now() })
        }
      } finally { setPending(product._id, false) }
    },

    async setQty(productId, qty, color) {
      setPending(productId, true)
      try {
        if (get().mode === 'server') {
          const r = await api.patch<{ cart: Cart }>(`/cart/items/${productId}`, { qty, color: color ?? undefined })
          const cart = toCart(r.cart)
          set({ cart })
        } else {
          const g = readGuest()
          const lines = qty <= 0 ? g.lines.filter(l => l.productId !== productId) : g.lines.map(l => l.productId === productId ? { ...l, qty: Math.min(MAX_QTY, qty), color: color ?? l.color } : l)
          writeGuest(lines, g.coupon)
          set({ cart: await quoteGuest(lines, g.coupon) })
        }
      } finally { setPending(productId, false) }
    },

    async remove(productId) {
      const removed = get().cart.items.find(i => i.product && i.product._id === productId)
      await get().setQty(productId, 0)
      return removed
    },

    async clear() {
      if (get().mode === 'server') {
        const r = await api.del<{ cart: Cart }>('/cart')
        const cart = toCart(r.cart)
        set({ cart })
      } else {
        writeGuest([], null)
        set({ cart: emptyCart })
      }
    },

    async applyCoupon(code) {
      const normalized = code.trim().toUpperCase()
      if (get().mode === 'server') {
        const r = await api.post<{ cart: Cart }>('/cart/coupon', { code: normalized })
        const cart = toCart(r.cart)
        set({ cart })
        if (!cart.coupon) throw new Error(cart.couponError ?? 'That coupon can’t be applied.')
      } else {
        const g = readGuest()
        // Validate via quote; backend returns couponError if invalid.
        if (g.lines.length === 0) throw new Error('Add something to your cart first.')
        const r = await api.post<QuoteResponse>('/cart/quote', {
          items: g.lines.map(l => ({ productId: l.productId, qty: l.qty, color: l.color ?? undefined })), coupon: normalized,
        })
        const cart = toCart(r)
        if (!cart.coupon) throw new Error(cart.couponError ?? 'That coupon can’t be applied.')
        writeGuest(g.lines, normalized)
        set({ cart })
      }
    },

    async removeCoupon() {
      if (get().mode === 'server') {
        const r = await api.del<{ cart: Cart }>('/cart/coupon')
        const cart = toCart(r.cart)
        set({ cart })
      } else {
        const g = readGuest()
        writeGuest(g.lines, null)
        set({ cart: await quoteGuest(g.lines, null) })
      }
    },
  }
})
