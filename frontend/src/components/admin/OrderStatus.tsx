import { StatusChip } from '@/components/account/StatusChip'
import { ADMIN_STATUS_LABELS } from '@/hooks/useAdmin'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminOrder, AdminOrderStatus, OrderStatus } from '@/types'

const RETURN_TONE: Partial<Record<AdminOrderStatus, string>> = {
  return_requested: 'bg-accent/12 text-accent [--dot:var(--accent)]',
  returned: 'bg-surface-2 text-ink [--dot:var(--muted)]',
}

/** Storefront StatusChip for the core lifecycle, plus the returns statuses only the admin sees in bulk. */
export function AdminStatusChip({ status, className }: { status: AdminOrderStatus; className?: string }) {
  const tone = RETURN_TONE[status]
  if (!tone) return <StatusChip status={status as OrderStatus} className={className} />
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap', tone, className)}>
      <span className="size-1.5 rounded-full bg-[var(--dot)]" aria-hidden="true" />
      {ADMIN_STATUS_LABELS[status] ?? status}
    </span>
  )
}

const EVENT: Record<AdminOrderStatus, string> = {
  pending_payment: 'Order placed',
  paid: 'Payment received',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  return_requested: 'Return requested',
  returned: 'Returned',
  payment_failed: 'Payment failed',
  cancelled: 'Cancelled',
}
const FLOW: AdminOrderStatus[] = ['paid', 'processing', 'shipped', 'delivered']
const BAD: AdminOrderStatus[] = ['payment_failed', 'cancelled']

/**
 * Same visual language as the customer OrderTimeline, with admin wording,
 * every note shown, and the returns statuses understood.
 */
export function AdminTimeline({ order, className }: { order: Pick<AdminOrder, 'timeline' | 'status' | 'createdAt'>; className?: string }) {
  const events = [...(order.timeline ?? [])].sort((a, b) => +new Date(a.at) - +new Date(b.at))
  if (!events.length) events.push({ status: 'pending_payment', at: order.createdAt })
  const reached = new Set(events.map((e) => e.status))
  const upcoming = FLOW.includes(order.status) ? FLOW.filter((s) => !reached.has(s) && FLOW.indexOf(s) > FLOW.indexOf(order.status)) : []
  const lastIdx = events.length - 1

  return (
    <ol className={cn('relative', className)}>
      {events.map((e, i) => {
        const isLast = i === lastIdx
        const bad = BAD.includes(e.status)
        return (
          <li key={`${e.status}-${e.at}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {i < lastIdx || upcoming.length ? <span aria-hidden="true" className="absolute top-5 bottom-0 left-[9px] w-px bg-ink/80" /> : null}
            <span aria-hidden="true" className={cn('relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full', isLast && bad ? 'bg-danger' : 'bg-ink')}>
              {isLast && !bad ? <span className="size-[7px] rounded-full bg-accent" /> : <span className="size-[5px] rounded-full bg-bg" />}
            </span>
            <div className="min-w-0 pt-px">
              <p className={cn('text-sm font-medium', bad && isLast ? 'text-danger' : 'text-ink')}>{EVENT[e.status] ?? e.status}</p>
              <p className="text-[12px] text-muted tabular"><time dateTime={e.at}>{formatDateTime(e.at)}</time></p>
              {e.note ? <p className="mt-1 rounded-lg bg-surface-2/70 px-2.5 py-1.5 text-[13px] leading-snug text-ink text-pretty">{e.note}</p> : null}
            </div>
          </li>
        )
      })}
      {upcoming.map((s, i) => (
        <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
          {i < upcoming.length - 1 ? <span aria-hidden="true" className="absolute top-5 bottom-0 left-[9px] w-px border-l border-dashed border-line" /> : null}
          <span aria-hidden="true" className="relative z-10 mt-0.5 size-[19px] shrink-0 rounded-full border border-dashed border-muted/50 bg-surface" />
          <p className="pt-px text-sm text-muted">{EVENT[s]}</p>
        </li>
      ))}
    </ol>
  )
}

/** "COD" / "Online" tag for order rows and headers. */
export function PaymentTag({ cod, className }: { cod: boolean; className?: string }) {
  return cod ? (
    <span className={cn('inline-flex h-[22px] items-center rounded-full border border-warning/35 bg-warning/[0.08] px-2 text-[11px] font-semibold tracking-[0.06em] text-warning uppercase', className)}>COD</span>
  ) : (
    <span className={cn('inline-flex h-[22px] items-center rounded-full border border-line px-2 text-[11px] font-medium text-muted', className)}>Online</span>
  )
}
