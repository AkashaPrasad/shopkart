import { Link } from 'react-router-dom'
import { money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderItem } from '@/types'
import type { OrderDetail } from '@/hooks/useOrders'
import { Thumb } from '@/components/checkout/OrderSummaryCard'

export function OrderItems({ items, className }: { items: OrderItem[]; className?: string }) {
  return (
    <ul className={cn('divide-y divide-line', className)}>
      {items.map((i, idx) => (
        <li key={`${i.product}-${i.color ?? ''}-${idx}`} className="flex items-center gap-4 py-3.5">
          <Thumb src={i.image} alt={i.name} size="lg" />
          <div className="min-w-0 flex-1">
            <Link to={`/product/${i.slug}`} className="line-clamp-1 text-[15px] font-medium text-ink hover:underline">{i.name}</Link>
            <p className="mt-0.5 text-[13px] text-muted">{i.color ? <>{i.color} · </> : null}<span className="tabular">Qty {i.qty} × {money(i.price)}</span></p>
          </div>
          <p className="text-[15px] font-medium text-ink tabular">{money(i.price * i.qty)}</p>
        </li>
      ))}
    </ul>
  )
}

/** Overlapping thumbnails (+N) for order rows. */
export function ThumbStack({ items, max = 4 }: { items: OrderItem[]; max?: number }) {
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  return (
    <div className="flex items-center" aria-label={plural(items.reduce((s, i) => s + i.qty, 0), 'item')}>
      {shown.map((i, idx) => (
        <span key={`${i.product}-${idx}`} className="-ml-2.5 block size-11 overflow-hidden rounded-[10px] border-2 border-surface bg-surface-2 first:ml-0" style={{ zIndex: max - idx }}>
          {i.image ? <img src={i.image} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : null}
        </span>
      ))}
      {extra > 0 ? <span className="-ml-2.5 grid size-11 place-items-center rounded-[10px] border-2 border-surface bg-surface-2 text-[12px] font-semibold text-ink tabular">+{extra}</span> : null}
    </div>
  )
}

export function OrderTotals({ order }: { order: Pick<OrderDetail, 'subtotal' | 'discount' | 'shipping' | 'total' | 'coupon' | 'items' | 'codFee'> }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0)
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal · {plural(count, 'item')}</dt><dd className="tabular">{money(order.subtotal)}</dd></div>
      {order.discount > 0 ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Discount{order.coupon ? <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-px text-[11px] font-semibold tracking-[0.04em] text-success">{order.coupon}</span> : null}</dt>
          <dd className="text-success tabular">−{money(order.discount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-4"><dt className="text-muted">Shipping</dt><dd className="tabular">{order.shipping === 0 ? <span className="text-success">Free</span> : money(order.shipping)}</dd></div>
      {order.codFee ? <div className="flex justify-between gap-4"><dt className="text-muted">Cash on delivery fee</dt><dd className="tabular">{money(order.codFee)}</dd></div> : null}
      <div className="mt-1.5 flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
        <dt className="font-semibold text-ink">Total</dt>
        <dd className="font-display text-2xl font-medium tabular">{money(order.total)}</dd>
      </div>
    </dl>
  )
}
