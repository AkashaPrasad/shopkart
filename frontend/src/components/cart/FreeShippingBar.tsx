import { Truck } from 'lucide-react'
import type { CartSummary } from '@/types'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'

/** "Add ₹X more for free shipping" with a progress track. */
export function FreeShippingBar({ summary, className }: { summary: CartSummary; className?: string }) {
  const threshold = summary.freeShippingThreshold || FREE_SHIPPING_THRESHOLD
  const remaining = Math.max(0, summary.amountToFreeShipping)
  const unlocked = summary.subtotal > 0 && (remaining === 0 || summary.shipping === 0)
  const progress = unlocked ? 1 : Math.min(1, summary.subtotal / threshold)

  return (
    <div className={cn('space-y-2.5', className)}>
      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        <Truck className={cn('h-4 w-4 shrink-0', unlocked ? 'text-success' : 'text-muted')} aria-hidden="true" />
        {unlocked ? (
          remaining > 0
            ? <span><span className="font-medium text-success">Free shipping</span> — courtesy of your coupon.</span>
            : <span><span className="font-medium text-success">Free shipping unlocked.</span> Nice haul.</span>
        ) : (
          <span>Add <span className="font-semibold tabular">{money(remaining)}</span> more for <span className="font-medium">free shipping</span>.</span>
        )}
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(summary.subtotal, threshold)}
        aria-valuetext={unlocked ? 'Free shipping unlocked' : `${money(remaining)} to go`}
      >
        <div
          className={cn('h-full rounded-full transition-[width,background-color] duration-700 ease-out-expo', unlocked ? 'bg-success' : 'bg-accent')}
          style={{ width: `${Math.max(progress * 100, summary.subtotal > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  )
}
