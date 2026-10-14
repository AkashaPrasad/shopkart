import { money, discountPct } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Price({ price, compareAtPrice, className, size = 'md' }: { price: number; compareAtPrice?: number | null; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const pct = discountPct(price, compareAtPrice)
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' }
  return (
    <span className={cn('inline-flex items-baseline gap-2 tabular', className)}>
      <span className={cn('font-semibold text-ink', sizes[size])}>{money(price)}</span>
      {pct > 0 && compareAtPrice ? (
        <>
          <span className="text-muted line-through text-sm">{money(compareAtPrice)}</span>
          <span className="text-success text-xs font-semibold">{pct}% off</span>
        </>
      ) : null}
    </span>
  )
}
