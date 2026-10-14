import { useEffect, useState } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { Product, ProductListResponse } from '@/types'

type Resource<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }

/**
 * Session-cached GETs for the landing page. The hero chips and the marquee share one
 * `/products/featured` request, and coming back to `/` renders instantly from the cache.
 */
const inflight = new Map<string, Promise<unknown>>()
const resolved = new Map<string, unknown>()

function load<T>(path: string): Promise<T> {
  let p = inflight.get(path) as Promise<T> | undefined
  if (!p) {
    p = api.get<T>(path).then(data => {
      resolved.set(path, data)
      return data
    })
    inflight.set(path, p)
    p.catch(() => inflight.delete(path))
  }
  return p
}

function useResource<T>(path: string): Resource<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Resource<T>>(() =>
    resolved.has(path) ? { status: 'ready', data: resolved.get(path) as T } : { status: 'loading' },
  )

  useEffect(() => {
    if (resolved.has(path)) return // already rendered from the cache
    let alive = true
    load<T>(path).then(
      data => alive && setState({ status: 'ready', data }),
      error => alive && setState({ status: 'error', error: errorMessage(error, 'Couldn’t reach the shelves.') }),
    )
    return () => {
      alive = false
    }
  }, [path, attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt(a => a + 1)
  }
  return { ...state, retry }
}

export function useFeatured() {
  const r = useResource<{ items: Product[] }>('/products/featured')
  return { ...r, items: r.status === 'ready' ? r.data.items : [] }
}

/** Catalog-level numbers (total, price floor, per-category counts) from a 1-item list query. */
export function useCatalogStats() {
  const r = useResource<ProductListResponse>('/products?limit=1')
  if (r.status !== 'ready') return { status: r.status, total: null, minPrice: null, categoryCounts: {} as Record<string, number> }
  const categoryCounts: Record<string, number> = {}
  for (const c of r.data.facets?.categories ?? []) categoryCounts[c.key] = c.count
  return { status: r.status, total: r.data.total, minPrice: r.data.facets?.priceRange?.min ?? null, categoryCounts }
}
