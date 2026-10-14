import { Banknote, CreditCard } from 'lucide-react'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

import { COD_FEE, COD_MAX_TOTAL } from '@/lib/constants'

export type PayMethod = 'razorpay' | 'cod'
export { COD_FEE }
export const COD_LIMIT = COD_MAX_TOTAL // paise — max order total for cash on delivery

/** Online vs cash-on-delivery as radio cards (native radios: arrow keys work). */
export function PaymentMethodPicker({ value, onChange, total, disabled }: { value: PayMethod; onChange: (m: PayMethod) => void; total: number; disabled?: boolean }) {
  const codAllowed = total + COD_FEE <= COD_LIMIT
  const options = [
    {
      id: 'razorpay' as const,
      icon: CreditCard,
      title: 'Pay online',
      body: 'UPI, cards, netbanking or wallets — secured by Razorpay.',
      tag: 'Instant',
      enabled: true,
    },
    {
      id: 'cod' as const,
      icon: Banknote,
      title: 'Cash on delivery',
      body: codAllowed ? `Pay when it arrives. Adds a ${money(COD_FEE)} handling fee.` : `Available on orders up to ${money(COD_LIMIT)}.`,
      tag: `+${money(COD_FEE)}`,
      enabled: codAllowed,
    },
  ]
  return (
    <fieldset className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5" disabled={disabled}>
      <legend className="sr-only">Payment method</legend>
      <p className="mb-3 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase" aria-hidden="true">How would you like to pay?</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map(({ id, icon: Icon, title, body, tag, enabled }) => (
          <label
            key={id}
            className={cn(
              'group relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-[border-color,box-shadow] duration-200',
              'border-line hover:border-ink/25 has-[input:checked]:border-ink has-[input:checked]:shadow-[0_0_0_1px_var(--ink)]',
              'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-surface',
              !enabled && 'cursor-not-allowed opacity-55 hover:border-line',
            )}
          >
            <input type="radio" name="payment-method" value={id} checked={value === id} disabled={!enabled} onChange={() => onChange(id)} className="peer sr-only" />
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink transition-colors group-has-[input:checked]:bg-ink group-has-[input:checked]:text-bg">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-medium text-ink">{title}</span>
                <span className="rounded-full bg-surface-2 px-2 py-px text-[11px] font-medium text-muted tabular">{tag}</span>
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">{body}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
