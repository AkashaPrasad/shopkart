import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, SearchX } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { ProductGrid } from '@/components/product/ProductGrid'
import { CategoryChips } from '@/components/shop/CategoryChips'
import { SortSelect } from '@/components/shop/SortSelect'
import { SearchBox } from '@/components/shop/SearchBox'
import { ActiveFilters, PriceFilter, QuickFilters, isQuickFilterOn, type PriceRange, type QuickFilterKey } from '@/components/shop/Filters'
import { categoryCopy } from '@/components/shop/categories'
import { hasActiveFilters, PAGE_SIZE, parseFilters, parsePage, useProductList, type SortKey } from '@/hooks/useProducts'
import type { Category } from '@/types'

type Patch = Record<string, string | null>

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const page = parsePage(params)
  const list = useProductList(filters, page)
  const reduce = useReducedMotion()
  const resultsRef = useRef<HTMLElement>(null)

  // When filters change while the shopper is deep in the grid, bring them back to the top of the results.
  const filterKey = JSON.stringify(filters)
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    const el = resultsRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [filterKey, reduce])

  /** Writes filter changes to the URL. Any filter change resets pagination unless `keepPage`. */
  const update = useCallback((patch: Patch, opts: { replace?: boolean; keepPage?: boolean } = {}) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k)
        else next.set(k, v)
      }
      if (!opts.keepPage) next.delete('page')
      return next
    }, { replace: opts.replace })
  }, [setParams])

  const setPrice = (r: PriceRange) => update({ minPrice: r.minPrice != null ? String(r.minPrice) : null, maxPrice: r.maxPrice != null ? String(r.maxPrice) : null })
  const clearAll = () => update({ q: null, category: null, minPrice: null, maxPrice: null, inStock: null, onSale: null, minRating: null, badge: null })
  const toggleQuick = (key: QuickFilterKey) => {
    const on = isQuickFilterOn(filters, key)
    if (key === 'inStock' || key === 'onSale') update({ [key]: on ? null : '1' })
    else if (key === 'minRating') update({ minRating: on ? null : '4' })
    else update({ badge: on ? null : key.split(':')[1] })
  }

  const counts = useMemo(() => {
    if (!list.facets) return undefined
    return Object.fromEntries(list.facets.categories.map(c => [c.key, c.count])) as Partial<Record<Category, number>>
  }, [list.facets])

  const cat = filters.category ? categoryCopy(filters.category) : undefined
  const [lead, accent] = filters.q
    ? ['Results for ', `“${filters.q}”`]
    : cat ? cat.headline : ['The whole ', 'tiny shop.']
  const sub = filters.q
    ? 'Matching names, taglines and tags across the shop.'
    : cat ? cat.blurb : 'Stickers, pins, pens and pocket-sized joy. Small objects, honest prices, shipped within 24 hours.'

  const firstLoad = list.status === 'loading'
  const remaining = Math.max(0, list.total - list.items.length)
  const filtered = hasActiveFilters(filters)

  const statusText = firstLoad
    ? 'Finding tiny things…'
    : list.status === 'error'
      ? ''
      : list.refreshing
        ? 'Updating…'
        : list.total === 0
          ? 'No matches'
          : `Showing ${list.items.length} of ${list.total} ${list.total === 1 ? 'thing' : 'things'}`

  return (
    <>
      <Seo
        title={filters.q ? `Search: ${filters.q}` : cat ? cat.label : 'Shop'}
        description={cat ? `${cat.label} at ShopKart. ${cat.blurb} Small objects, honest prices.` : 'Browse the whole ShopKart catalogue: stickers, pins, stationery, desk goods, tiny tech and desk snacks. Small objects, honest prices.'}
      />

      <section className="container-x pb-8 pt-10 sm:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">The shop{cat ? ` / ${cat.label}` : ''}</p>
        <h1 className="mt-3 max-w-3xl text-balance font-display text-[44px] leading-[1.02] sm:text-6xl lg:text-7xl">
          {lead}<em className="italic text-accent">{accent}</em>
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-muted sm:text-lg">{sub}</p>
        <SearchBox
          value={filters.q}
          onDebouncedChange={q => update({ q: q || null }, { replace: true })}
          size="lg"
          className="mt-8 max-w-xl"
        />
      </section>

      <div className="border-y border-line bg-bg/85 backdrop-blur-xl md:sticky md:top-16 md:z-30">
        <div className="container-x flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <CategoryChips value={filters.category} counts={counts} onChange={c => update({ category: c || null })} />
          <div className="flex shrink-0 items-center gap-2 *:flex-1 *:justify-between sm:*:flex-none lg:justify-end">
            <PriceFilter value={filters} bounds={list.facets?.priceRange} onChange={setPrice} />
            <SortSelect value={filters.sort} onChange={(s: SortKey) => update({ sort: s === 'popular' ? null : s })} />
          </div>
        </div>
      </div>

      <section ref={resultsRef} className="container-x scroll-mt-24 pt-6 md:scroll-mt-44 lg:scroll-mt-32" aria-labelledby="results-heading">
        <h2 id="results-heading" className="sr-only">Products</h2>
        <QuickFilters filters={filters} onToggle={toggleQuick} className="mb-4" />
        <div className="mb-6 flex min-h-8 flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted tabular" role="status">
            {list.refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            {statusText}
          </p>
          <ActiveFilters
            filters={filters}
            onClear={clearAll}
            onRemove={k => update(k === 'price' ? { minPrice: null, maxPrice: null } : { [k]: null })}
          />
        </div>

        {list.status === 'error' ? (
          <ErrorState message={list.error ?? 'We couldn’t load the shop just now.'} onRetry={list.retry} />
        ) : firstLoad ? (
          <ProductGrid products={[]} skeletons={8} />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
            title={filters.q ? `Nothing tiny enough for “${filters.q}”` : 'Nothing fits those filters'}
            description={filtered ? 'Try a broader word, or loosen the filters a little. The good stuff is hiding just outside them.' : 'The shelves are being restocked. Check back very soon.'}
            action={filtered ? (
              <button type="button" onClick={clearAll} className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]">
                Clear filters
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <ProductGrid products={list.items} dimmed={list.refreshing} skeletons={list.loadingMore ? Math.min(PAGE_SIZE, remaining) : 0} />

            <div className="mt-16 flex flex-col items-center gap-4 text-center">
              {remaining > 0 ? (
                <>
                  <div className="w-48">
                    <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out-expo" style={{ width: `${(list.items.length / list.total) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted tabular">{list.items.length} of {list.total} · {remaining} more to see</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ page: String(list.loadedPage + 1) }, { replace: true, keepPage: true })}
                    disabled={list.loadingMore}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-ink px-7 text-sm font-semibold transition-[color,background-color,border-color,transform] hover:bg-ink hover:text-bg disabled:opacity-60 active:scale-[0.98]"
                  >
                    {list.loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…</> : `Load ${Math.min(PAGE_SIZE, remaining)} more`}
                  </button>
                  {list.loadMoreError ? (
                    <p className="text-sm text-danger" role="alert">
                      {list.loadMoreError}{' '}
                      <button type="button" onClick={list.retry} className="font-semibold underline underline-offset-4">Try again</button>
                    </p>
                  ) : null}
                </>
              ) : list.total > PAGE_SIZE ? (
                <p className="font-display text-xl italic text-muted">That’s everything. Tiny, but complete.</p>
              ) : null}
            </div>
          </>
        )}
      </section>
    </>
  )
}
