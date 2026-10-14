import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, Tag, X } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/store/cart'
import { EASE, PillButton, Spinner, inputClass } from '@/components/auth/form'
import type { Cart } from '@/types'

/** Apply / remove a coupon on the server cart. Errors stay inline; success gets a toast. */
export function CouponField({ cart, disabled }: { cart: Cart; disabled?: boolean }) {
  const applyCoupon = useCart((s) => s.applyCoupon)
  const removeCoupon = useCart((s) => s.removeCoupon)
  const reduce = useReducedMotion()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'apply' | 'remove' | null>(null)

  const { coupon, summary } = cart
  const freeShipViaCoupon = summary.shipping === 0 && summary.subtotal < summary.freeShippingThreshold && summary.itemCount > 0
  // The server cart explains why a saved coupon no longer applies (e.g. minimum not met after removing items).
  const couponError = (cart as Cart & { couponError?: string | null }).couponError ?? null
  const notApplied = !!coupon && (!!couponError || (summary.discount === 0 && !freeShipViaCoupon))

  const apply = async (e: FormEvent) => {
    e.preventDefault()
    const c = code.trim()
    if (!c) { setError('Enter a code first'); return }
    setPending('apply')
    setError(null)
    try {
      await applyCoupon(c)
      toast.success(`${c.toUpperCase()} applied`)
      setCode('')
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err, 'That code didn’t work.'))
    } finally {
      setPending(null)
    }
  }

  const remove = async () => {
    setPending('remove')
    try {
      await removeCoupon()
      toast('Coupon removed')
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t remove the coupon.'))
    } finally {
      setPending(null)
    }
  }

  if (coupon) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5', notApplied ? 'border-warning/40 bg-warning/[0.06]' : 'border-success/40 bg-success/[0.06]')}>
        <Tag className={cn('size-4 shrink-0', notApplied ? 'text-warning' : 'text-success')} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-[0.04em] text-ink">{coupon}</p>
          <p className={cn('text-[12px]', notApplied ? 'text-warning' : 'text-success')}>
            {couponError ? couponError : summary.discount > 0 ? <>You save <span className="tabular">{money(summary.discount)}</span></> : freeShipViaCoupon ? 'Free shipping unlocked' : 'Not applicable to this bag yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={disabled || pending !== null}
          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
          aria-label={`Remove coupon ${coupon}`}
        >
          {pending === 'remove' ? <Spinner className="size-4" /> : <X className="size-4" />}
        </button>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="inline-flex items-center gap-2 text-sm font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink disabled:opacity-50">
          <Tag className="size-3.5" aria-hidden="true" />Have a coupon code?
        </button>
      ) : null}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.form
            key="coupon"
            onSubmit={apply}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <label htmlFor={id} className="text-[13px] font-medium text-ink">Coupon code</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={id}
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); if (error) setError(null) }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setError(null) } }}
                placeholder="WELCOME10"
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-err` : undefined}
                className={cn(inputClass, 'h-10 tracking-[0.06em] uppercase placeholder:normal-case placeholder:tracking-normal')}
                disabled={disabled || pending !== null}
              />
              <PillButton type="submit" size="sm" className="h-10 px-5" loading={pending === 'apply'} disabled={disabled}>Apply</PillButton>
            </div>
            {error ? (
              <p id={`${id}-err`} className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-danger" role="alert">
                <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />{error}
              </p>
            ) : null}
          </motion.form>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
