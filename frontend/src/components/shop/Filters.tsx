import { useState, type FormEvent } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ProductFilters } from '@/hooks/useProducts'
import { PRICE_PRESETS } from '@/lib/constants'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { categoryCopy } from './categories'

/** Paise, like the URL and the API. */
export type PriceRange = { minPrice: number | null; maxPrice: number | null }

const PRESETS: { label: string; range: PriceRange }[] = PRICE_PRESETS.map(p => ({
  label: p.label,
  range: { minPrice: p.min ?? null, maxPrice: p.max ?? null },
}))

export function priceLabel({ minPrice, maxPrice }: PriceRange): string | null {
  if (minPrice == null && maxPrice == null) return null
  const preset = PRESETS.find(p => p.range.minPrice === minPrice && p.range.maxPrice === maxPrice)
  if (preset) return preset.label
  if (minPrice == null) return `Under ${money(maxPrice!)}`
  if (maxPrice == null) return `${money(minPrice)}+`
  return `${money(minPrice)}–${money(maxPrice)}`
}

/** Whole rupees typed by the shopper -> paise. */
function parseRupees(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) * 100 : NaN
}
const toRupeeField = (paise: number | null) => (paise != null ? String(Math.round(paise / 100)) : '')

/** Price popover: three quick presets plus a custom min/max (whole rupees). */
export function PriceFilter({ value, onChange, bounds, className }: {
  value: PriceRange
  onChange: (r: PriceRange) => void
  /** Catalogue price bounds in paise (from facets), used as placeholders. */
  bounds?: { min: number; max: number } | null
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [error, setError] = useState<string | null>(null)
  const label = priceLabel(value)

  function onOpenChange(next: boolean) {
    if (next) {
      setMin(toRupeeField(value.minPrice))
      setMax(toRupeeField(value.maxPrice))
      setError(null)
    }
    setOpen(next)
  }

  function apply(range: PriceRange) { onChange(range); setOpen(false) }

  function submit(e: FormEvent) {
    e.preventDefault()
    const lo = parseRupees(min), hi = parseRupees(max)
    if (Number.isNaN(lo) || Number.isNaN(hi)) { setError('Use whole rupees, like 20.'); return }
    if (lo != null && hi != null && lo > hi) { setError('Min should be less than max.'); return }
    apply({ minPrice: lo, maxPrice: hi })
  }

  const isPreset = (r: PriceRange) => r.minPrice === value.minPrice && r.maxPrice === value.maxPrice
  const input = 'h-11 w-full rounded-full border border-line bg-bg pl-8 pr-3 text-sm tabular outline-none transition-colors placeholder:text-muted focus:border-ink'

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-[color,background-color,border-color,transform] active:scale-[0.98]',
          label ? 'border-ink bg-ink text-bg' : 'border-line hover:border-ink/40',
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5">{label ?? <><span className="text-muted">Price</span><span>Any</span></>}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180', label ? 'text-bg/70' : 'text-muted')} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius)] border-line bg-surface p-5 shadow-[var(--shadow-lift)]">
        <p className="font-display text-lg">Price</p>
        <p className="mt-0.5 text-xs text-muted">Small objects. Honest prices. Pick a range.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(isPreset(p.range) ? { minPrice: null, maxPrice: null } : p.range)}
              aria-pressed={isPreset(p.range)}
              className={cn(
                'h-9 rounded-full border px-3.5 text-sm font-medium tabular transition-[color,background-color,border-color,transform] active:scale-[0.97]',
                isPreset(p.range) ? 'border-ink bg-ink text-bg' : 'border-line hover:border-ink/40',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 border-t border-line pt-4" noValidate>
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Minimum price in rupees</span>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">₹</span>
              <input value={min} onChange={e => { setMin(e.target.value.replace(/[^\d]/g, '')); setError(null) }} inputMode="numeric" placeholder={bounds ? String(Math.floor(bounds.min / 100)) : 'Min'} className={input} aria-invalid={!!error} />
            </label>
            <span className="text-muted" aria-hidden="true">–</span>
            <label className="relative flex-1">
              <span className="sr-only">Maximum price in rupees</span>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">₹</span>
              <input value={max} onChange={e => { setMax(e.target.value.replace(/[^\d]/g, '')); setError(null) }} inputMode="numeric" placeholder={bounds ? String(Math.ceil(bounds.max / 100)) : 'Max'} className={input} aria-invalid={!!error} />
            </label>
          </div>
          {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => apply({ minPrice: null, maxPrice: null })} className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
              Reset
            </button>
            <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]">
              Apply
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

export type QuickFilterKey = 'inStock' | 'onSale' | 'minRating' | 'badge:new' | 'badge:bestseller'
export const QUICK_FILTERS: { key: QuickFilterKey; label: string }[] = [
  { key: 'inStock', label: 'In stock' },
  { key: 'onSale', label: 'On sale' },
  { key: 'minRating', label: '4★ & up' },
  { key: 'badge:new', label: 'New' },
  { key: 'badge:bestseller', label: 'Bestsellers' },
]

export function isQuickFilterOn(f: ProductFilters, key: QuickFilterKey) {
  if (key === 'inStock') return f.inStock
  if (key === 'onSale') return f.onSale
  if (key === 'minRating') return f.minRating != null
  return f.badge === key.split(':')[1]
}

/** Toggle chips for the common narrowing filters (badge chips are mutually exclusive: one badge at a time). */
export function QuickFilters({ filters, onToggle, className }: { filters: ProductFilters; onToggle: (key: QuickFilterKey) => void; className?: string }) {
  return (
    <div className={cn('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0', className)} role="group" aria-label="Quick filters">
      {QUICK_FILTERS.map(q => {
        const on = isQuickFilterOn(filters, q.key)
        return (
          <button
            key={q.key}
            type="button"
            onClick={() => onToggle(q.key)}
            aria-pressed={on}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-[color,background-color,border-color,transform] active:scale-[0.97]',
              on ? 'border-accent/50 bg-accent/10 font-medium text-ink' : 'border-dashed border-line text-muted hover:border-ink/40 hover:text-ink',
            )}
          >
            {on ? <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.75} aria-hidden="true" /> : null}
            {q.label}
          </button>
        )
      })}
    </div>
  )
}

export type FilterChipKey = 'q' | 'category' | 'price' | 'inStock' | 'onSale' | 'minRating' | 'badge'

/** Removable chips summarising the active filters, plus "Clear all". */
export function ActiveFilters({ filters, onRemove, onClear, className }: {
  filters: ProductFilters
  onRemove: (key: FilterChipKey) => void
  onClear: () => void
  className?: string
}) {
  const chips: { key: FilterChipKey; label: string }[] = []
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”` })
  if (filters.category) chips.push({ key: 'category', label: categoryCopy(filters.category)?.label ?? filters.category })
  const price = priceLabel(filters)
  if (price) chips.push({ key: 'price', label: price })
  if (filters.inStock) chips.push({ key: 'inStock', label: 'In stock' })
  if (filters.onSale) chips.push({ key: 'onSale', label: 'On sale' })
  if (filters.minRating != null) chips.push({ key: 'minRating', label: `${filters.minRating}★ & up` })
  if (filters.badge) chips.push({ key: 'badge', label: filters.badge === 'bestseller' ? 'Bestsellers' : filters.badge === 'new' ? 'New' : 'Limited' })
  if (!chips.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map(c => (
        <button
          key={c.key}
          type="button"
          onClick={() => onRemove(c.key)}
          className="group inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 pl-3 pr-2 text-sm transition-[background-color,transform] hover:bg-line active:scale-[0.97]"
          aria-label={`Remove filter ${c.label}`}
        >
          <span className="max-w-[14rem] truncate">{c.label}</span>
          <X className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-ink" aria-hidden="true" />
        </button>
      ))}
      {chips.length > 1 ? (
        <button type="button" onClick={onClear} className="ml-1 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          Clear all
        </button>
      ) : null}
    </div>
  )
}
