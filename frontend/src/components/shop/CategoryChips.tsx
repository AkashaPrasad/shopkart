import { motion, useReducedMotion } from 'motion/react'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'
import { CATEGORY_LIST } from './categories'

/** "All" + one chip per category, with counts from the API facets. The active pill glides between chips. */
export function CategoryChips({ value, onChange, counts, className }: {
  value: Category | ''
  onChange: (c: Category | '') => void
  counts?: Partial<Record<Category, number>>
  className?: string
}) {
  const reduce = useReducedMotion()
  const total = counts ? Object.values(counts).reduce((s, n) => s + (n ?? 0), 0) : undefined
  const chips: { key: Category | ''; label: string; count?: number }[] = [
    { key: '', label: 'All', count: total },
    ...CATEGORY_LIST.map(c => ({ key: c.key, label: c.label, count: counts?.[c.key] })),
  ]
  return (
    <div className={cn('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0', className)} role="group" aria-label="Filter by category">
      {chips.map(c => {
        const active = value === c.key
        const empty = c.count === 0 && !active
        return (
          <button
            key={c.key || 'all'}
            type="button"
            onClick={() => onChange(c.key)}
            aria-pressed={active}
            className={cn(
              'relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[color,border-color,transform] duration-200 active:scale-[0.97]',
              active ? 'border-ink text-bg' : 'border-line text-ink hover:border-ink/40',
              empty && 'text-muted',
            )}
          >
            {active ? (
              <motion.span
                layoutId="category-chip"
                className="absolute inset-0 rounded-full bg-ink"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
              />
            ) : null}
            <span className="relative">{c.label}</span>
            {c.count != null ? <span className={cn('relative tabular text-xs', active ? 'text-bg/70' : 'text-muted')}>{c.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
