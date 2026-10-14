import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { formatDate, money, plural } from '@/lib/format'
import type { OrderDetail } from '@/hooks/useOrders'
import { StatusChip } from './StatusChip'
import { ThumbStack } from './OrderItems'

/** One order in a list: thumbnails, number, date, total, status. The whole row is the link. */
export function OrderRow({ order }: { order: OrderDetail }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0)
  const awaiting = order.status === 'pending_payment' || order.status === 'payment_failed'
  return (
    <li>
      <Link
        to={`/account/orders/${order._id}`}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-[var(--radius)] border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-ink/25 hover:shadow-[var(--shadow-soft)] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_20px] sm:p-5"
      >
        <ThumbStack items={order.items} max={3} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink tabular">{order.orderNumber}</p>
          <p className="truncate text-[13px] text-muted">
            <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time> · {plural(count, 'item')}
          </p>
        </div>
        <div className="text-right sm:order-none">
          <p className="text-[15px] font-semibold text-ink tabular">{money(order.total)}</p>
          {awaiting ? <p className="text-[12px] font-medium text-accent">Pay now →</p> : null}
        </div>
        <div className="col-span-3 flex sm:col-span-1 sm:justify-end">
          <StatusChip status={order.status} />
        </div>
        <ChevronRight className="hidden size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden="true" />
      </Link>
    </li>
  )
}

export function OrderRowSkeleton() {
  return (
    <li className="flex items-center gap-4 rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5" aria-hidden="true">
      <div className="flex">{[0, 1, 2].map((i) => <span key={i} className="-ml-2.5 size-11 animate-pulse rounded-[10px] border-2 border-surface bg-surface-2 first:ml-0" />)}</div>
      <div className="flex-1"><div className="h-4 w-28 animate-pulse rounded bg-surface-2" /><div className="mt-2 h-3 w-40 animate-pulse rounded bg-surface-2/70" /></div>
      <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
    </li>
  )
}
