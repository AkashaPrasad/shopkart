import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { Badge, CartProduct, Category, Product, ProductListResponse } from '@/types'

export const CATEGORIES: Category[] = ['stickers', 'pins', 'stationery', 'desk', 'tech', 'snacks']
export const SORTS = ['popular', 'newest', 'price_asc', 'price_desc', 'rating'] as const
export type SortKey = (typeof SORTS)[number]
export const PAGE_SIZE = 12
export const BADGES: Badge[] = ['new', 'bestseller', 'limited']

/** Filters as they live in the URL. Prices are paise, like the API (e.g. /shop?maxPrice=19900 = under ₹199). */
export interface ProductFilters {
  q: string
  category: Category | ''
  sort: SortKey
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean
  onSale: boolean
  /** Minimum average rating (the UI offers 4★ & up). */
  minRating: number | null
  badge: Badge | ''
}

function toPrice(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export function parseFilters(params: URLSearchParams): ProductFilters {
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'popular'
  const rating = Number(params.get('minRating'))
  const badge = params.get('badge') ?? ''
  return {
    q: (params.get('q') ?? '').trim(),
    category: (CATEGORIES as string[]).includes(category) ? (category as Category) : '',
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : 'popular',
    minPrice: toPrice(params.get('minPrice')),
    maxPrice: toPrice(params.get('maxPrice')),
    inStock: params.get('inStock') === '1',
    onSale: params.get('onSale') === '1',
    minRating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    badge: (BADGES as string[]).includes(badge) ? (badge as Badge) : '',
  }
}

export function parsePage(params: URLSearchParams): number {
  const n = Number(params.get('page') ?? '1')
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 1
}

export function hasActiveFilters(f: ProductFilters) {
  return Boolean(f.q || f.category || f.minPrice != null || f.maxPrice != null || f.inStock || f.onSale || f.minRating != null || f.badge)
}

function buildQuery(f: ProductFilters, page: number, limit = PAGE_SIZE) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('category', f.category)
  if (f.sort !== 'popular') p.set('sort', f.sort)
  if (f.minPrice != null) p.set('minPrice', String(f.minPrice))
  if (f.maxPrice != null) p.set('maxPrice', String(f.maxPrice))
  if (f.inStock) p.set('inStock', '1')
  if (f.onSale) p.set('onSale', '1')
  if (f.minRating != null) p.set('minRating', String(f.minRating))
  if (f.badge) p.set('badge', f.badge)
  p.set('page', String(page))
  p.set('limit', String(limit))
  return p.toString()
}

/** Keep only what the cart/wishlist need, so guest lists in localStorage stay small. Accepts catalogue or server-lite products. */
export function toLite(p: CartProduct): CartProduct {
  const image = p.images?.[0] ?? p.image
  return {
    _id: p._id, slug: p.slug, name: p.name, tagline: p.tagline, price: p.price, compareAtPrice: p.compareAtPrice ?? null,
    image, images: image ? [image] : [], stock: p.stock, category: p.category, colors: p.colors, badges: p.badges,
  }
}

type Facets = ProductListResponse['facets']

export interface ProductListState {
  status: 'loading' | 'ready' | 'error'
  /** True while a new filter set is loading and the previous results are still on screen. */
  refreshing: boolean
  items: Product[]
  total: number
  pages: number
  loadedPage: number
  facets: Facets | null
  error: string | null
  loadingMore: boolean
  loadMoreError: string | null
}

interface InternalState extends ProductListState { key: string }

const initialState: InternalState = {
  key: '', status: 'loading', refreshing: false, items: [], total: 0, pages: 0, loadedPage: 0, facets: null, error: null, loadingMore: false, loadMoreError: null,
}

function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
}

/**
 * Paginated catalogue keyed by filters. Changing filters reloads pages 1..page (so deep links like ?page=3 work);
 * increasing `page` with the same filters appends. In-flight requests are aborted whenever inputs change.
 */
export function useProductList(filters: ProductFilters, page: number) {
  const key = buildQuery(filters, 1)
  const [state, setState] = useState<InternalState>(initialState)
  const [attempt, setAttempt] = useState(0)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const cur = stateRef.current
    const sameKey = cur.key === key && cur.status === 'ready'
    if (sameKey && page === cur.loadedPage) return
    if (sameKey && page < cur.loadedPage) {
      setState(s => ({ ...s, items: s.items.slice(0, page * PAGE_SIZE), loadedPage: page }))
      return
    }
    const ctrl = new AbortController()
    const from = sameKey ? cur.loadedPage + 1 : 1
    const to = Math.max(page, from)
    setState(s => sameKey
      ? { ...s, loadingMore: true, loadMoreError: null }
      : { ...s, key, status: s.items.length ? 'ready' : 'loading', refreshing: s.items.length > 0, error: null, loadingMore: false, loadMoreError: null })

    Promise.all(range(from, to).map(p => api.get<ProductListResponse>(`/products?${buildQuery(filters, p)}`, { signal: ctrl.signal })))
      .then(results => {
        const last = results[results.length - 1]
        const fresh = results.flatMap(r => r.items)
        setState(s => ({
          key, status: 'ready', refreshing: false, error: null, loadingMore: false, loadMoreError: null,
          items: sameKey ? [...s.items, ...fresh] : fresh,
          total: last.total, pages: last.pages, loadedPage: to, facets: last.facets,
        }))
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e instanceof Error && e.name === 'AbortError')) return
        const message = errorMessage(e, 'We couldn’t load the shop just now.')
        setState(s => sameKey
          ? { ...s, loadingMore: false, loadMoreError: message }
          : { ...s, key, status: 'error', refreshing: false, items: [], error: message })
      })
    return () => ctrl.abort()
    // `filters` changes identity with every URL change; `key` + the early returns above keep this idempotent.
  }, [key, page, attempt, filters])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  const { key: _key, ...publicState } = state
  return { ...publicState, retry }
}

export interface ProductDetailState {
  status: 'loading' | 'ready' | 'notfound' | 'error'
  product: Product | null
  related: Product[]
  error: string | null
}

export function useProduct(slug: string | undefined) {
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${slug ?? ''}#${attempt}`
  const [state, setState] = useState<ProductDetailState & { key: string }>({ key: '', status: 'loading', product: null, related: [], error: null })

  useEffect(() => {
    if (!slug) return
    const ctrl = new AbortController()
    const key = `${slug}#${attempt}`
    api.get<{ product: Product; related?: Product[] }>(`/products/${encodeURIComponent(slug)}`, { signal: ctrl.signal })
      .then(r => setState({ key, status: 'ready', product: r.product, related: r.related ?? [], error: null }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e instanceof Error && e.name === 'AbortError')) return
        if (e instanceof ApiError && e.status === 404) setState({ key, status: 'notfound', product: null, related: [], error: null })
        else setState({ key, status: 'error', product: null, related: [], error: errorMessage(e, 'We couldn’t load this product.') })
      })
    return () => ctrl.abort()
  }, [slug, attempt])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  // Anything not yet answered for the current slug/attempt is "loading" (derived, so no flash of stale data).
  const current: ProductDetailState = !slug
    ? { status: 'notfound', product: null, related: [], error: null }
    : state.key === requestKey
      ? state
      : { status: 'loading', product: null, related: [], error: null }
  return { ...current, retry }
}
