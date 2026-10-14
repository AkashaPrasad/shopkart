import { Link } from 'react-router-dom'
import { AlertTriangle, Pencil } from 'lucide-react'
import { money } from '@/lib/format'
import { AddressLines, AddressTypeTag } from '@/components/address/AddressCard'
import type { Address, Cart } from '@/types'
import { Thumb, productImage } from './OrderSummaryCard'
import { StepHeading } from './StepHeading'

export function ReviewStep({ cart, address, onChangeAddress }: { cart: Cart; address: Address; onChangeAddress: () => void }) {
  const problems = cart.items.filter((i) => i.available === false)
  return (
    <section>
      <StepHeading title="Looks good?" sub="One last look before you pay." />

      <div className="rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">Delivering to</p>
            <AddressTypeTag type={address.type} isDefault={address.isDefault} />
            <AddressLines address={address} className="mt-2" />
          </div>
          <button type="button" onClick={onChangeAddress} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface-2">
            <Pencil className="size-3.5" aria-hidden="true" />Change
          </button>
        </div>
      </div>

      {problems.length ? (
        <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-warning/30 bg-warning/[0.08] px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            {problems.map((p) => p.product.name).join(', ')} {problems.length === 1 ? 'isn’t' : 'aren’t'} available in that quantity any more.{' '}
            <Link to="/cart" className="font-semibold underline underline-offset-4">Fix in cart</Link>
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface">
        <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">In your bag</p>
          <Link to="/cart" className="text-[13px] font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">Edit bag</Link>
        </div>
        <ul className="divide-y divide-line px-4 sm:px-5">
          {cart.items.map((i) => (
            <li key={`${i.product._id}-${i.color ?? ''}`} className="flex items-center gap-4 py-4">
              <Thumb src={productImage(i.product)} alt={i.product.name} size="lg" />
              <div className="min-w-0 flex-1">
                <Link to={`/product/${i.product.slug}`} className="line-clamp-1 text-[15px] font-medium text-ink hover:underline">{i.product.name}</Link>
                <p className="mt-0.5 text-[13px] text-muted">
                  {i.color ? <>{i.color} · </> : null}<span className="tabular">Qty {i.qty} × {money(i.product.price)}</span>
                </p>
                {i.available === false ? <p className="mt-0.5 text-[12px] font-medium text-warning">Not available in this quantity</p> : null}
              </div>
              <p className="text-[15px] font-medium text-ink tabular">{money(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
