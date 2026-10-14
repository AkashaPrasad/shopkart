import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Clock3, Gift, MessageSquareText, PackageX, RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'
import { useOrder, isCod, PAID_STATUSES, type OrderDetail } from '@/hooks/useOrders'
import { usePayOrder } from '@/hooks/usePayOrder'
import { money, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/shared/ErrorState'
import { EASE, PillButton, firstName, pill } from '@/components/auth/form'
import { PayStep } from '@/components/checkout/PayStep'
import { AddressLines } from '@/components/address/AddressCard'
import { SuccessMark } from '@/components/account/SuccessMark'
import { OrderItems, OrderTotals } from '@/components/account/OrderItems'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { StatusChip, paymentMethodLabel } from '@/components/account/StatusChip'
import { BuyAgainButton } from '@/components/account/BuyAgainButton'

function Card({ title, children, className, aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn('rounded-[20px] border border-line bg-surface p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-sans text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="container-x max-w-[920px] py-14" aria-busy="true" aria-label="Loading your order">
      <div className="mx-auto size-24 animate-pulse rounded-full bg-surface-2" />
      <div className="mx-auto mt-8 h-10 w-80 max-w-full animate-pulse rounded-lg bg-surface-2" />
      <div className="mx-auto mt-3 h-5 w-64 max-w-full animate-pulse rounded bg-surface-2/70" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[20px] bg-surface-2/70" />)}</div>
    </div>
  )
}

function Hero({ order }: { order: OrderDetail }) {
  const reduce = useReducedMotion()
  const user = useAuth((s) => s.user)
  const paid = PAID_STATUSES.includes(order.status)
  const refunded = order.status === 'cancelled' && !!order.payment.razorpayPaymentId
  const lastNote = [...order.timeline].reverse().find((t) => t.note)?.note

  const fade = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.45, ease: EASE } }) as const

  if (paid || order.status === 'return_requested' || order.status === 'returned') {
    const cod = isCod(order)
    return (
      <div className="flex flex-col items-center text-center">
        <SuccessMark />
        <motion.p {...fade(0.35)} className="mt-2 text-[12px] font-semibold tracking-[0.16em] text-muted uppercase">{cod ? 'Cash on delivery' : 'Payment received'}</motion.p>
        <motion.h1 {...fade(0.45)} className="mt-3 font-display text-[2.3rem] leading-[1.05] font-medium text-balance sm:text-[3.4rem]">
          Order <span className="tabular whitespace-nowrap">{order.orderNumber}</span> <em className="font-normal text-accent">{cod ? 'placed' : 'confirmed'}</em>.
        </motion.h1>
        <motion.p {...fade(0.55)} className="mt-4 max-w-md text-[15px] leading-relaxed text-muted text-pretty">
          {cod && !order.payment.paidAt
            ? <>Thanks, {firstName(user?.name)}. Keep <span className="font-medium text-ink tabular">{money(order.total)}</span> handy for the courier — we’ll keep the timeline below up to date.</>
            : <>Thanks, {firstName(user?.name)}. Your tiny things are getting ready — we’ll keep the timeline below up to date.</>}
        </motion.p>
      </div>
    )
  }
  const variant = refunded
    ? { icon: <PackageX className="size-7" />, tone: 'bg-warning/12 text-warning', title: 'Order cancelled — refund started', body: lastNote ?? 'This order was cancelled after payment. A full refund is on its way to your original payment method.' }
    : order.status === 'cancelled'
      ? { icon: <XCircle className="size-7" />, tone: 'bg-surface-2 text-muted', title: 'This order was cancelled', body: lastNote ?? 'Nothing was charged.' }
      : order.status === 'payment_failed'
        ? { icon: <XCircle className="size-7" />, tone: 'bg-danger/10 text-danger', title: 'Payment didn’t go through', body: order.payment.failureReason ?? 'Your bank or card declined it. Your order is saved — try again whenever you’re ready.' }
        : { icon: <Clock3 className="size-7" />, tone: 'bg-warning/12 text-warning', title: 'Payment pending', body: `Order ${order.orderNumber} is saved, but we haven’t received the payment yet. Retry below or pay later from Orders.` }
  return (
    <div className="flex flex-col items-center text-center">
      <motion.span {...fade(0)} className={cn('grid size-16 place-items-center rounded-full', variant.tone)}>{variant.icon}</motion.span>
      <motion.h1 {...fade(0.1)} className="mt-6 font-display text-[2.1rem] leading-[1.08] font-medium text-balance sm:text-5xl">{variant.title}</motion.h1>
      <motion.p {...fade(0.2)} className="mt-4 max-w-md text-[15px] leading-relaxed text-muted text-pretty">{variant.body}</motion.p>
    </div>
  )
}

export default function OrderSuccess() {
  const { id } = useParams()
  const { order, status, error, refetch, setOrder } = useOrder(id)
  const pay = usePayOrder({
    onComplete: (o) => { setOrder(o); useCart.getState().refresh().catch(() => {}) },
  })
  const announced = useRef(false)

  // Make sure the bag reflects the purchase even if this page was opened directly.
  useEffect(() => {
    if (order && PAID_STATUSES.includes(order.status) && !announced.current) {
      announced.current = true
      useCart.getState().refresh().catch(() => {})
    }
  }, [order])

  if (status === 'error' && !order) {
    return <div className="container-x max-w-[720px] py-16"><ErrorState message={error ?? 'Couldn’t load this order.'} onRetry={refetch} /></div>
  }
  if (!order) return <Skeleton />

  const cod = isCod(order)
  const paid = cod ? !!order.payment.paidAt : PAID_STATUSES.includes(order.status)
  const payable = order.status === 'pending_payment' || order.status === 'payment_failed'
  const orderRef = { id: order._id, orderNumber: order.orderNumber, total: order.total }
  const method = paymentMethodLabel(cod ? 'cod' : order.payment.method)
  const showPayPanel = pay.phase.kind !== 'idle' && pay.phase.kind !== 'done'

  return (
    <div className="container-x max-w-[980px] py-10 sm:py-16">
      {showPayPanel ? (
        <div className="mx-auto max-w-[640px]">
          <PayStep phase={pay.phase} onRetry={(o) => void pay.retry(o)} onRecheck={(o) => void pay.recheck(o)} onProceed={() => void pay.proceed()} onBack={() => { pay.reset(); refetch() }} />
        </div>
      ) : (
        <Hero order={order} />
      )}

      <div className="mt-8 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        {payable && !showPayPanel ? (
          <PillButton variant="accent" onClick={() => void pay.retry(orderRef)} loading={pay.busy}><RefreshCw className="size-4" />Retry payment · {money(order.total)}</PillButton>
        ) : null}
        <Link to={`/account/orders/${order._id}`} className={pill(payable ? 'outline' : 'ink')}>View order</Link>
        <Link to="/shop" className={pill(payable ? 'ghost' : 'outline')}>Continue shopping <ArrowRight className="size-4" /></Link>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Card title={paid ? 'Amount paid' : cod && order.status !== 'cancelled' ? 'Pay on delivery' : 'Order total'}>
          <p className="font-display text-4xl font-medium tabular">{money(order.total)}</p>
          <p className="mt-2 text-[13px] text-muted">{order.discount > 0 ? <>You saved <span className="text-success tabular">{money(order.discount)}</span>{order.coupon ? ` with ${order.coupon}` : ''}</> : order.shipping === 0 ? 'Shipping was on us.' : `Includes ${money(order.shipping)} shipping.`}</p>
        </Card>
        <Card title="Payment">
          <div className="flex items-center gap-2"><StatusChip status={order.status} /></div>
          <p className="mt-3 text-sm text-ink">{cod ? 'Cash on delivery' : method ? `${method} via Razorpay` : 'Online via Razorpay'}</p>
          {order.payment.paidAt ? <p className="mt-0.5 text-[13px] text-muted tabular">{formatDateTime(order.payment.paidAt)}</p> : null}
          {order.payment.razorpayPaymentId ? <p className="mt-1 truncate font-mono text-[12px] text-muted" title={order.payment.razorpayPaymentId}>{order.payment.razorpayPaymentId}</p> : null}
        </Card>
        <Card title="Delivering to">
          <AddressLines address={order.address} />
          {order.deliveryNote ? <p className="mt-3 flex gap-2 border-t border-line pt-3 text-[13px] leading-snug text-muted"><MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{order.deliveryNote}</p> : null}
          {order.giftMessage ? <p className="mt-3 flex gap-2 border-t border-line pt-3 text-[13px] leading-snug text-muted italic"><Gift className="mt-0.5 size-3.5 shrink-0 not-italic" aria-hidden="true" />“{order.giftMessage}”</p> : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <Card title="What’s coming" aside={<BuyAgainButton orderId={order._id} lineCount={new Set(order.items.map((i) => i.product)).size} variant="ghost" className="-my-2 h-9 px-3 text-[13px]" />}>
          <OrderItems items={order.items} className="-my-3.5" />
          <div className="mt-5 border-t border-line pt-5"><OrderTotals order={order} /></div>
        </Card>
        <Card title="Timeline">
          <OrderTimeline order={order} />
        </Card>
      </div>
    </div>
  )
}
