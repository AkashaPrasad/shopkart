import type { CartSummary as Summary } from '@/types'
import { money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Order totals. Reused by checkout: pass `compact` for tighter spacing in sidebars.
 * All values are paise from the server (never computed client-side).
 */
export function CartSummary({ summary, coupon, compact = false, className }: { summary: Summary; coupon?: string | null; compact?: boolean; className?: string }) {
  const row = cn('flex items-baseline justify-between gap-4', compact ? 'text-sm' : 'text-[15px]')
  const freeShipping = summary.shipping === 0 && summary.subtotal > 0
  return (
    <dl className={cn('tabular', compact ? 'space-y-2' : 'space-y-3', className)}>
      <div className={row}>
        <dt className="text-muted">Subtotal <span className="text-xs">({plural(summary.itemCount, 'item')})</span></dt>
        <dd className="font-medium">{money(summary.subtotal)}</dd>
      </div>
      {summary.discount > 0 ? (
        <div className={row}>
          <dt className="flex flex-wrap items-center gap-2 text-muted">
            Discount
            {coupon ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-success">{coupon}</span> : null}
          </dt>
          <dd className="font-medium text-success">−{money(summary.discount)}</dd>
        </div>
      ) : null}
      <div className={row}>
        <dt className="flex flex-wrap items-center gap-2 text-muted">
          Shipping
          {freeShipping && coupon && summary.discount === 0 && summary.amountToFreeShipping > 0
            ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-success">{coupon}</span>
            : null}
        </dt>
        <dd className={cn('font-medium', freeShipping && 'text-success')}>{summary.subtotal === 0 ? '—' : freeShipping ? 'Free' : money(summary.shipping)}</dd>
      </div>
      <div className={cn('flex items-baseline justify-between gap-4 border-t border-line', compact ? 'pt-3' : 'pt-4')}>
        <dt className="font-medium">
          Total
          <span className="block text-xs font-normal text-muted">incl. of all taxes</span>
        </dt>
        <dd className={cn('font-semibold tracking-tight', compact ? 'text-xl' : 'text-2xl')}>{money(summary.total)}</dd>
      </div>
    </dl>
  )
}
