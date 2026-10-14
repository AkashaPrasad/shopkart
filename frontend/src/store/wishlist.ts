import { create } from 'zustand'
import { api } from '@/lib/api'
import { toLite } from '@/hooks/useProducts'
import type { CartProduct } from '@/types'

/**
 * Wishlist. Guests keep a list in localStorage (`sk_wishlist`: lite products, newest first); signed-in shoppers use
 * the server list. On login the guest list is merged into the account (same pattern as the cart).
 * Toggles are optimistic and roll back if the server says no.
 */
export type WishProduct = CartProduct

const KEY = 'sk_wishlist'
const MAX_ITEMS = 100

function readGuest(): WishProduct[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const items: unknown = parsed?.items
    return Array.isArray(items) ? (items as WishProduct[]).filter(p => p && typeof p._id === 'string') : []
  } catch { return [] }
}
function writeGuest(items: WishProduct[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ items: items.slice(0, MAX_ITEMS) })) } catch { /* storage full or blocked */ }
}

type ListResponse = { items: WishProduct[] }

interface WishlistState {
  items: WishProduct[]
  mode: 'guest' | 'server'
  loaded: boolean
  /** Which identity the list was last synced for ('guest' or a user id); repeat syncs for the same identity are skipped. */
  syncedFor: string | null
  pending: Record<string, boolean>
  /** Call when auth is ready and whenever the user changes. */
  sync: (userId: string | null) => Promise<void>
  has: (productId: string) => boolean
  /** Saves or unsaves. Resolves with the new saved state. */
  toggle: (product: CartProduct) => Promise<boolean>
  add: (product: CartProduct) => Promise<void>
  remove: (productId: string) => Promise<WishProduct | undefined>
}

let inflight: { key: string; promise: Promise<void> } | null = null

export const useWishlist = create<WishlistState>((set, get) => {
  const setPending = (id: string, v: boolean) => set(s => ({ pending: { ...s.pending, [id]: v } }))

  async function write(productId: string, method: 'post' | 'del', optimistic: WishProduct[]) {
    const before = get().items
    set({ items: optimistic })
    if (get().mode === 'guest') { writeGuest(optimistic); return }
    setPending(productId, true)
    try {
      const r = method === 'post'
        ? await api.post<ListResponse>(`/wishlist/${productId}`)
        : await api.del<ListResponse>(`/wishlist/${productId}`)
      set({ items: reconcile(optimistic, r.items ?? []) })
    } catch (e) {
      set({ items: before })
      throw e
    } finally { setPending(productId, false) }
  }

  return {
    items: [],
    mode: 'guest',
    loaded: false,
    syncedFor: null,
    pending: {},

    sync(userId) {
      const key = userId ?? 'guest'
      if (get().syncedFor === key && get().loaded) return Promise.resolve()
      if (inflight?.key === key) return inflight.promise
      const promise = (async () => {
        const guest = readGuest()
        if (!userId) { set({ items: guest, mode: 'guest' }); return }
        try {
          const r = guest.length
            ? await api.post<ListResponse>('/wishlist/merge', { productIds: guest.map(p => p._id).slice(0, MAX_ITEMS) })
            : await api.get<ListResponse>('/wishlist')
          if (guest.length) writeGuest([])
          set({ items: reconcile(guest, r.items ?? []), mode: 'server' })
        } catch {
          // Wishlist API unavailable: keep working locally; the list merges into the account on a later sync.
          set({ items: guest, mode: 'guest' })
        }
      })().finally(() => {
        set({ loaded: true, syncedFor: key })
        if (inflight?.key === key) inflight = null
      })
      inflight = { key, promise }
      return promise
    },

    has: (productId) => get().items.some(p => p._id === productId),

    async toggle(product) {
      const id = product._id
      if (get().pending[id]) return get().has(id)
      if (get().has(id)) {
        await write(id, 'del', get().items.filter(p => p._id !== id))
        return false
      }
      await write(id, 'post', [toLite(product), ...get().items])
      return true
    },

    async add(product) {
      if (get().has(product._id)) return
      await write(product._id, 'post', [toLite(product), ...get().items])
    },

    async remove(productId) {
      const removed = get().items.find(p => p._id === productId)
      if (!removed) return undefined
      await write(productId, 'del', get().items.filter(p => p._id !== productId))
      return removed
    },
  }
})

/** Server order (newest first) and membership are the truth; keep any extra local fields (e.g. tagline) we already had. */
function reconcile(local: WishProduct[], server: WishProduct[]): WishProduct[] {
  const known = new Map(local.map(p => [p._id, p]))
  return server.map(p => ({ ...known.get(p._id), ...p }))
}

/** Reactive "is this product saved?" selector. */
export function useIsSaved(productId: string) {
  return useWishlist(s => s.items.some(p => p._id === productId))
}
