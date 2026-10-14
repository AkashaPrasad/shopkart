import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Lock, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/store/cart'
import { useAddresses } from '@/hooks/useAddresses'
import { usePayOrder, type OrderRef } from '@/hooks/usePayOrder'
import { cancelIfStillPending } from '@/hooks/useOrders'
import { money } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { EASE, PillButton, pill } from '@/components/auth/form'
import { Stepper, type CheckoutStep } from '@/components/checkout/Stepper'
import { AddressStep } from '@/components/checkout/AddressStep'
import { ReviewStep } from '@/components/checkout/ReviewStep'
import { PayStep } from '@/components/checkout/PayStep'
import { OrderSummaryCard } from '@/components/checkout/OrderSummaryCard'
import { PaymentMethodPicker, COD_FEE, COD_LIMIT, type PayMethod } from '@/components/checkout/PaymentMethodPicker'
import { OrderNotes } from '@/components/checkout/OrderNotes'

/** Identifies "the same purchase" so paying again after a dismissal reuses the saved order instead of creating a duplicate. */
function purchaseKey(addressId: string | null, coupon: string | null | undefined, items: { product: { _id: string }; qty: number; color?: string | null }[], extra: string) {
  return [addressId ?? '', (coupon ?? '').toUpperCase(), extra, ...items.map((i) => `${i.product._id}:${i.qty}:${i.color ?? ''}`).sort()].join('|')
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12" aria-busy="true" aria-label="Loading checkout">
      <div className="flex flex-col gap-4">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-[168px] animate-pulse rounded-[var(--radius)] bg-surface-2/70" />)}
        </div>
      </div>
      <div className="h-[380px] animate-pulse rounded-[20px] bg-surface-2/70" />
    </div>
  )
}

export default function Checkout() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const cart = useCart((s) => s.cart)
  const mode = useCart((s) => s.mode)
  const cartLoading = useCart((s) => s.loading)
  const book = useAddresses()

  const [step, setStep] = useState<CheckoutStep>('address')
  const [addressId, setAddressId] = useState<string | null>(null)
  const [stalled, setStalled] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod>('razorpay')
  const [notes, setNotes] = useState({ deliveryNote: '', giftMessage: '' })
  /** The order created by this checkout session (if any) and the purchase it was for. */
  const lastOrder = useRef<{ ref: OrderRef; key: string } | null>(null)
  const pendingKey = useRef<string>('')

  const pay = usePayOrder({
    onComplete: (order) => {
      navigate(`/order/success/${order._id}`, { replace: true })
      useCart.getState().refresh().catch(() => {})
      // An earlier attempt from this session (dismissed, then changed address/method) must not linger as a second unpaid order.
      const prev = lastOrder.current?.ref
      if (prev && prev.id !== order._id) void cancelIfStillPending(prev.id)
    },
    onRejected: (e) => {
      toast.error(e.message)
      if (e.status === 401) { navigate('/login?next=/checkout'); return }
      if (e.code === 'ADDRESS_INVALID') { setStep('address'); book.load().catch(() => {}); return }
      useCart.getState().refresh().catch(() => {})
      setStep('review')
    },
  })
  const { phase } = pay

  // Remember the order this session created, keyed by what was being bought.
  useEffect(() => {
    if ('order' in phase && phase.order && 'id' in phase.order) {
      const ref = phase.order
      if (lastOrder.current?.ref.id !== ref.id) lastOrder.current = { ref, key: pendingKey.current }
      else lastOrder.current = { ref, key: lastOrder.current.key }
    }
  }, [phase])

  // Warm the confirmation page while the customer reviews, so the hand-off after paying is instant.
  useEffect(() => { if (step !== 'address') void import('@/pages/OrderSuccess') }, [step])

  // Fresh server truth (stock, prices, coupon validity) whenever checkout opens.
  useEffect(() => {
    if (mode === 'server') useCart.getState().refresh().catch(() => {})
  }, [mode])

  // The App syncs the cart after auth. If that never lands in server mode, offer a retry instead of spinning forever.
  useEffect(() => {
    if (mode === 'server' || cartLoading) { setStalled(false); return }
    const t = setTimeout(() => setStalled(true), 2500)
    return () => clearTimeout(t)
  }, [mode, cartLoading])

  // Keep a valid selection: default address first, else the newest.
  useEffect(() => {
    if (!book.items.length) { if (addressId) setAddressId(null); return }
    if (!addressId || !book.items.some((a) => a._id === addressId)) {
      setAddressId((book.items.find((a) => a.isDefault) ?? book.items[0])._id)
    }
  }, [book.items, addressId])

  const address = useMemo(() => book.items.find((a) => a._id === addressId) ?? null, [book.items, addressId])
  const codFee = payMethod === 'cod' ? COD_FEE : 0
  const payable = cart.summary.total + codFee
  const currentKey = purchaseKey(addressId, cart.coupon, cart.items, `${payMethod}|${notes.deliveryNote.trim()}|${notes.giftMessage.trim()}`)

  // If the bag grows past the COD limit, fall back to paying online.
  useEffect(() => {
    if (payMethod === 'cod' && cart.summary.total + COD_FEE > COD_LIMIT) { setPayMethod('razorpay'); toast(`Cash on delivery is available up to ${money(COD_LIMIT)} — switched to paying online.`) }
  }, [payMethod, cart.summary.total])
  const hasProblems = cart.items.some((i) => i.available === false)

  const goTo = useCallback((s: CheckoutStep) => {
    if (pay.busy) return
    setStep(s)
    pay.reset()
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [pay, reduce])

  const startPayment = () => {
    if (!addressId || pay.busy || hasProblems) return
    setStep('pay')
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    const body = { addressId, coupon: cart.coupon, paymentMethod: payMethod, deliveryNote: notes.deliveryNote, giftMessage: notes.giftMessage }
    if (payMethod === 'cod') {
      void pay.checkout(body, payable)
      return
    }
    const existing = lastOrder.current
    if (existing && existing.key === currentKey && existing.ref.total === cart.summary.total) {
      void pay.retry(existing.ref)
    } else {
      pendingKey.current = currentKey
      void pay.checkout(body, cart.summary.total)
    }
  }

  const retrySync = async () => {
    setRetrying(true)
    try { await useCart.getState().sync(true); setStalled(false) } catch { toast.error('Still can’t reach ShopKart. Check your connection.') } finally { setRetrying(false) }
  }

  const header = (
    <div className="mb-8 flex flex-col gap-6 sm:mb-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.14em] text-muted uppercase"><Lock className="size-3.5" aria-hidden="true" />Secure checkout</p>
          <h1 className="font-display text-[2.4rem] leading-[1] font-medium sm:text-5xl">Almost <em className="font-normal text-accent">yours</em>.</h1>
        </div>
        <Link to="/cart" className="hidden items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink sm:inline-flex"><ArrowLeft className="size-4" />Back to bag</Link>
      </div>
      <Stepper current={step} onSelect={goTo} locked={pay.busy} />
    </div>
  )

  // ---- states before the cart is ready ------------------------------------------------
  if (mode !== 'server') {
    return (
      <div className="container-x py-8 sm:py-12">
        {header}
        {stalled ? <ErrorState message="We couldn’t load your bag. Check your connection and try again." onRetry={retrying ? undefined : retrySync} /> : <CheckoutSkeleton />}
      </div>
    )
  }
  if (cart.items.length === 0 && phase.kind !== 'done') {
    return (
      <div className="container-x py-12 sm:py-16">
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="Your bag is empty"
          description="Nothing to check out yet. Unpaid orders wait for you in your account, if you were mid-payment."
          action={<div className="flex flex-col gap-2 sm:flex-row"><Link to="/shop" className={pill('ink')}>Browse the shop</Link><Link to="/account/orders" className={pill('ghost')}>View orders</Link></div>}
        />
      </div>
    )
  }

  const payCta = (
    <div className="flex flex-col gap-3">
      <PillButton variant="accent" size="lg" className="w-full" onClick={startPayment} disabled={!address || hasProblems || pay.busy || cartLoading} loading={pay.busy} loadingText={payMethod === 'cod' ? 'Placing order…' : 'Opening payment…'}>
        {payMethod === 'cod' ? <>Place order · {money(payable)}</> : <><Lock className="size-4" />Pay {money(payable)} securely</>}
      </PillButton>
      <p className="text-center text-[12px] leading-relaxed text-muted">
        {payMethod === 'cod' ? <>Pay {money(payable)} in cash when it arrives.</> : <>Secured by Razorpay · UPI, cards & netbanking</>}
        <br />You can cancel any time before it ships.
      </p>
    </div>
  )

  return (
    <div className="container-x py-8 sm:py-12">
      {header}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {step === 'address' ? (
                <AddressStep book={book} value={addressId} onChange={setAddressId} onContinue={() => address && goTo('review')} />
              ) : step === 'review' && address ? (
                <>
                  <ReviewStep cart={cart} address={address} onChangeAddress={() => goTo('address')} />
                  <PaymentMethodPicker value={payMethod} onChange={setPayMethod} total={cart.summary.total} disabled={pay.busy} />
                  <OrderNotes deliveryNote={notes.deliveryNote} giftMessage={notes.giftMessage} onChange={(p) => setNotes((n) => ({ ...n, ...p }))} disabled={pay.busy} />
                </>
              ) : step === 'review' ? (
                <AddressStep book={book} value={addressId} onChange={setAddressId} onContinue={() => address && goTo('review')} />
              ) : (
                <section aria-label="Payment">
                  <PayStep
                    phase={phase}
                    onRetry={(o) => void pay.retry(o)}
                    onRecheck={(o) => void pay.recheck(o)}
                    onProceed={() => void pay.proceed()}
                    onRestart={startPayment}
                    onBack={() => goTo('review')}
                    onReviewBag={() => { useCart.getState().refresh().catch(() => {}); goTo('review') }}
                  />
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-24">
          <OrderSummaryCard
            cart={cart}
            showItems={step !== 'review'}
            showCoupon={step !== 'pay'}
            couponDisabled={pay.busy}
            codFee={step !== 'address' ? codFee : 0}
            footer={step === 'review' ? payCta : undefined}
          />
          {step === 'pay' && address ? (
            <p className="mt-4 px-1 text-[13px] leading-relaxed text-muted">
              Shipping to <span className="text-ink">{address.fullName}</span>, {address.city} {address.pincode}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
