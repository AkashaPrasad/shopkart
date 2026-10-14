import { ORDER_STATUS_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const TONE: Record<OrderStatus, string> = {
  pending_payment: 'bg-warning/12 text-warning [--dot:var(--warning)]',
  paid: 'bg-success/10 text-success [--dot:var(--success)]',
  processing: 'bg-accent-2/10 text-accent-2 [--dot:var(--accent-2)]',
  shipped: 'bg-accent-2/10 text-accent-2 [--dot:var(--accent-2)]',
  delivered: 'bg-success/12 text-success [--dot:var(--success)]',
  payment_failed: 'bg-danger/10 text-danger [--dot:var(--danger)]',
  cancelled: 'bg-surface-2 text-muted [--dot:var(--muted)]',
  return_requested: 'bg-accent/10 text-accent [--dot:var(--accent)]',
  returned: 'bg-surface-2 text-ink [--dot:var(--ink)]',
}

/** Shared labels plus the return statuses (kept here so lib/format stays untouched). */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  ...(ORDER_STATUS_LABELS as Record<OrderStatus, string>),
  return_requested: ORDER_STATUS_LABELS.return_requested ?? 'Return requested',
  returned: ORDER_STATUS_LABELS.returned ?? 'Returned',
}

export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap', TONE[status], className)}>
      <span className="size-1.5 rounded-full bg-[var(--dot)]" aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

const METHOD: Record<string, string> = { card: 'Card', upi: 'UPI', netbanking: 'Netbanking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay Later', cardless_emi: 'Cardless EMI' }
export function paymentMethodLabel(method?: string | null) {
  if (!method) return null
  if (method === 'cod') return 'Cash on delivery'
  return METHOD[method] ?? method.charAt(0).toUpperCase() + method.slice(1)
}
