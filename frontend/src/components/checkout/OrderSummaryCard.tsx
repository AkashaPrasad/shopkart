import type { ReactNode } from 'react'
import { Truck } from 'lucide-react'
import { money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Cart, CartItem } from '@/types'
import { CouponField } from './CouponField'

/** The cart API returns `product.image` (string); the shared type says `images[]`. Accept both. */
export function productImage(p: CartItem['product']): string | undefined {
  return p.images?.[0] ?? (p as CartItem['product'] & { image?: string }).image
}

export function Thumb({ src, alt, qty, size = 'md' }: { src?: string; alt: string; qty?: number; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'size-11' : size === 'lg' ? 'size-16 sm:size-[72px]' : 'size-14'
  return (
    <span className={cn('relative block shrink-0', dims)}>
      <span className="block size-full overflow-hidden rounded-[10px] border border-line bg-surface-2">
        {src ? <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full object-cover" /> : null}
      </span>
      {qty && qty > 1 ? (
        <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-bg tabular ring-2 ring-surface">{qty}</span>
      ) : null}
    </span>
  )
}

export function SummaryRow({ label, value, tone, strong, hint }: { label: ReactNode; value: ReactNode; tone?: 'success' | 'muted'; strong?: boolean; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn('text-sm', strong ? 'font-semibold text-ink' : 'text-muted')}>
        {label}
        {hint ? <span className="mt-0.5 block text-[12px] font-normal text-muted">{hint}</span> : null}
      </dt>
      <dd className={cn('tabular text-sm', strong ? 'text-lg font-semibold text-ink' : 'text-ink', tone === 'success' && 'text-success')}>{value}</dd>
    </div>
  )
}

/** Subtotal → discount → shipping → total, with the free-shipping nudge. Paise in, ₹ out. */
export function Totals({ summary, coupon, codFee = 0 }: { summary: Cart['summary']; coupon?: string | null; codFee?: number }) {
  const progress = Math.min(100, Math.round((summary.subtotal / summary.freeShippingThreshold) * 100))
  return (
    <div>
      <dl className="flex flex-col gap-2.5">
        <SummaryRow label={`Subtotal · ${plural(summary.itemCount, 'item')}`} value={money(summary.subtotal)} />
        {summary.discount > 0 ? <SummaryRow label={<>Discount{coupon ? <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-px text-[11px] font-semibold tracking-[0.04em] text-success">{coupon}</span> : null}</>} value={`−${money(summary.discount)}`} tone="success" /> : null}
        <SummaryRow label="Shipping" value={summary.shipping === 0 ? <span className="font-medium text-success">Free</span> : money(summary.shipping)} />
        {codFee > 0 ? <SummaryRow label="Cash on delivery fee" value={money(codFee)} /> : null}
      </dl>
      {summary.shipping > 0 && summary.amountToFreeShipping > 0 ? (
        <div className="mt-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
          <p className="flex items-center gap-2 text-[13px] text-ink">
            <Truck className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
            Add <span className="font-semibold tabular">{money(summary.amountToFreeShipping)}</span> more for free shipping
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progress to free shipping">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="text-sm font-semibold text-ink">Total</p>
          <p className="text-[12px] text-muted">Inclusive of all taxes</p>
        </div>
        <p className="font-display text-[1.75rem] leading-none font-medium tabular" style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>{money(summary.total + codFee)}</p>
      </div>
    </div>
  )
}

function ItemLine({ item }: { item: CartItem }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Thumb src={productImage(item.product)} alt={item.product.name} qty={item.qty} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.product.name}</p>
        <p className="truncate text-[12px] text-muted">
          {item.color ? `${item.color} · ` : ''}<span className="tabular">{item.qty} × {money(item.product.price)}</span>
        </p>
      </div>
      <p className="text-sm font-medium text-ink tabular">{money(item.lineTotal)}</p>
    </li>
  )
}

/** Sticky checkout sidebar. Sections toggle per step; `footer` hosts the Pay CTA on review. */
export function OrderSummaryCard({ cart, showItems = true, showCoupon = true, couponDisabled, footer, className, codFee = 0 }: {
  cart: Cart
  codFee?: number
  showItems?: boolean
  showCoupon?: boolean
  couponDisabled?: boolean
  footer?: ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby="summary-heading" className={cn('rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6', className)}>
      <div className="flex items-baseline justify-between">
        <h2 id="summary-heading" className="font-display text-xl font-medium">Order summary</h2>
        <span className="text-[13px] text-muted tabular">{plural(cart.summary.itemCount, 'item')}</span>
      </div>
      {showItems ? (
        <ul className="mt-3 max-h-[min(320px,40vh)] divide-y divide-line overflow-y-auto pr-1 [scrollbar-width:thin]">
          {cart.items.map((i) => <ItemLine key={`${i.product._id}-${i.color ?? ''}`} item={i} />)}
        </ul>
      ) : null}
      {showCoupon ? <div className="mt-4 border-t border-line pt-4"><CouponField cart={cart} disabled={couponDisabled} /></div> : null}
      <div className="mt-4 border-t border-line pt-4"><Totals summary={cart.summary} coupon={cart.coupon} codFee={codFee} /></div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  )
}
