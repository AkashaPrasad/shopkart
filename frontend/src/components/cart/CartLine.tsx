import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import type { CartItem } from '@/types'
import { useCart } from '@/store/cart'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TickingQtyStepper } from '@/components/product/TickingQtyStepper'
import { ProductImage } from '@/components/product/ProductImage'
import { lineIssue, maxQtyFor, productImage, useLineActions } from './cartActions'

/** One cart line. `drawer` is the compact mini-cart layout, `page` the full cart table row. */
export function CartLine({ item, variant = 'page', onNavigate }: { item: CartItem; variant?: 'drawer' | 'page'; onNavigate?: () => void }) {
  const { changeQty, removeLine } = useLineActions()
  const pending = useCart(s => !!s.pending[item.product._id])
  const issue = lineIssue(item)
  const href = `/product/${item.product.slug}`
  const unitPrice = item.qty > 0 ? Math.round(item.lineTotal / item.qty) : item.product.price
  const max = Math.max(maxQtyFor(item), item.qty)
  const drawer = variant === 'drawer'

  const thumb = (
    <Link
      to={href}
      onClick={onNavigate}
      tabIndex={-1}
      aria-hidden="true"
      className={cn('relative block shrink-0 overflow-hidden rounded-[10px] bg-surface-2', drawer ? 'aspect-[4/5] w-[68px]' : 'aspect-[4/5] w-20 sm:w-24')}
    >
      <ProductImage src={productImage(item.product)} alt="" sizes="96px" className={cn(issue?.kind === 'soldout' && 'grayscale')} />
    </Link>
  )

  const title = (
    <div className="min-w-0">
      <Link to={href} onClick={onNavigate} className={cn('line-clamp-2 font-medium leading-snug transition-colors hover:text-accent', drawer ? 'text-[15px]' : 'text-base')}>
        {item.product.name}
      </Link>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        {item.color ? (
          <span className="inline-flex items-center gap-1.5">
            {(() => {
              const hex = item.product.colors?.find(c => c.name === item.color)?.hex
              return hex ? <span className="h-2.5 w-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]" style={{ backgroundColor: hex }} aria-hidden="true" /> : null
            })()}
            {item.color}
          </span>
        ) : null}
        {item.color ? <span aria-hidden="true">·</span> : null}
        <span className="tabular">{money(unitPrice)} each</span>
      </p>
    </div>
  )

  const stepper = (
    <TickingQtyStepper
      size="sm"
      value={item.qty}
      max={max}
      disabled={pending || issue?.kind === 'soldout' || issue?.kind === 'unavailable'}
      allowRemove
      onChange={n => (n < 1 ? removeLine(item) : changeQty(item, n))}
      className={cn('transition-opacity', pending && 'opacity-60')}
    />
  )

  const removeBtn = (
    <button
      type="button"
      onClick={() => removeLine(item)}
      disabled={pending}
      aria-label={`Remove ${item.product.name}`}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-[color,background-color,border-color,transform] hover:bg-surface-2 hover:text-ink disabled:opacity-50 active:scale-[0.98]"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  )

  const total = (
    <span className="inline-flex items-center gap-2 tabular font-semibold">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-label="Updating" /> : null}
      {money(item.lineTotal)}
    </span>
  )

  const issueNote = issue ? (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] bg-danger/8 px-3 py-2 text-sm text-danger" role="alert">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{issue.message}</span>
      {issue.kind === 'overstock' && issue.fixQty ? (
        <button type="button" onClick={() => changeQty(item, issue.fixQty!)} disabled={pending} className="font-semibold underline underline-offset-4 hover:no-underline disabled:opacity-50">
          Set to {issue.fixQty}
        </button>
      ) : (
        <button type="button" onClick={() => removeLine(item)} disabled={pending} className="font-semibold underline underline-offset-4 hover:no-underline disabled:opacity-50">
          Remove
        </button>
      )}
    </div>
  ) : null

  if (drawer) {
    return (
      <li className="flex gap-3.5 py-4">
        {thumb}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            {title}
            <span className="-mr-2 -mt-1.5">{removeBtn}</span>
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            {stepper}
            {total}
          </div>
          {issueNote}
        </div>
      </li>
    )
  }

  return (
    <li className={cn('py-6', issue && '-mx-3 my-3 rounded-[var(--radius)] border-t-0 px-3 ring-1 ring-danger/25 sm:-mx-4 sm:px-4')}>
      <div className="flex gap-4 sm:gap-5">
        {thumb}
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 sm:grid-cols-[1fr_7.5rem_6rem_2.25rem] sm:items-center">
          {title}
          <div className="justify-self-end sm:order-last">{removeBtn}</div>
          <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:contents">
            <div className="sm:justify-self-center">{stepper}</div>
            <div className="text-right sm:justify-self-end">{total}</div>
          </div>
        </div>
      </div>
      {issueNote ? <div className="sm:pl-[116px]">{issueNote}</div> : null}
    </li>
  )
}
