import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import type { OrderDetail } from '@/hooks/useOrders'

const LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Order placed',
  paid: 'Payment received',
  processing: 'Packing your order',
  shipped: 'Shipped',
  delivered: 'Delivered',
  payment_failed: 'Payment failed',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  returned: 'Returned',
}
const FLOW: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered']

/** Vertical timeline: real events with timestamps, then the upcoming steps greyed out. */
export function OrderTimeline({ order, className }: { order: Pick<OrderDetail, 'timeline' | 'status' | 'createdAt'>; className?: string }) {
  const events = [...(order.timeline ?? [])].sort((a, b) => +new Date(a.at) - +new Date(b.at))
  if (!events.length) events.push({ status: 'pending_payment', at: order.createdAt })
  const reached = new Set(events.map((e) => e.status))
  const upcoming = FLOW.includes(order.status) ? FLOW.filter((s) => !reached.has(s) && FLOW.indexOf(s) > FLOW.indexOf(order.status)) : []
  const lastIdx = events.length - 1

  return (
    <ol className={cn('relative', className)}>
      {events.map((e, i) => {
        const isLast = i === lastIdx
        const bad = e.status === 'payment_failed' || e.status === 'cancelled'
        return (
          <li key={`${e.status}-${e.at}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {i < lastIdx || upcoming.length ? <span aria-hidden="true" className="absolute top-5 bottom-0 left-[9px] w-px bg-ink/80" /> : null}
            <span aria-hidden="true" className={cn('relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full', isLast ? (bad ? 'bg-danger' : 'bg-ink') : 'bg-ink')}>
              {isLast && !bad ? <span className="size-[7px] rounded-full bg-accent" /> : <span className="size-[5px] rounded-full bg-bg" />}
            </span>
            <div className="min-w-0 pt-px">
              <p className={cn('text-sm font-medium', bad && isLast ? 'text-danger' : 'text-ink')}>
                {i === 0 && (e.status === 'pending_payment' || e.status === 'processing')
                  ? 'Order placed'
                  : e.status === 'pending_payment' ? 'Payment retried' : (LABEL[e.status] ?? e.status)}
              </p>
              <p className="text-[12px] text-muted tabular"><time dateTime={e.at}>{formatDateTime(e.at)}</time></p>
              {e.note ? <p className="mt-1 text-[13px] leading-snug text-muted text-pretty">{e.note}</p> : null}
            </div>
          </li>
        )
      })}
      {upcoming.map((s, i) => (
        <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
          {i < upcoming.length - 1 ? <span aria-hidden="true" className="absolute top-5 bottom-0 left-[9px] w-px border-l border-dashed border-line" /> : null}
          <span aria-hidden="true" className="relative z-10 mt-0.5 size-[19px] shrink-0 rounded-full border border-dashed border-muted/50 bg-surface" />
          <p className="pt-px text-sm text-muted">{LABEL[s]}</p>
        </li>
      ))}
    </ol>
  )
}
