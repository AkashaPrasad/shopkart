import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SortKey } from '@/hooks/useProducts'
import { cn } from '@/lib/utils'

export const SORT_LABELS: Record<SortKey, string> = {
  popular: 'Most loved',
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Top rated',
}

export function SortSelect({ value, onChange, className }: { value: SortKey; onChange: (v: SortKey) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as SortKey)}>
      <SelectTrigger
        aria-label="Sort products"
        className={cn('h-10 gap-1.5 rounded-full border-line transition-[border-color,transform] active:scale-[0.98] bg-transparent px-4 text-sm font-medium shadow-none hover:border-ink/40 focus-visible:ring-accent/30 data-[size=default]:h-10 dark:bg-transparent', className)}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted">Sort:</span>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="rounded-[var(--radius)] border-line bg-surface p-1 shadow-[var(--shadow-lift)]">
        {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
          <SelectItem key={k} value={k} className="rounded-[8px] py-2 pl-3 text-sm focus:bg-surface-2 focus:text-ink">
            {SORT_LABELS[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
