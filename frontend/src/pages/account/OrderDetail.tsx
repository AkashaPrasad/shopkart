import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { ArrowLeft, Check, Copy, FileText, Gift, MessageSquareText, PackageOpen, RefreshCw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/store/cart'
import { cancelOrder, invoiceable, isCod, useOrder, CANCELLABLE_STATUSES, PAYABLE_STATUSES, PAID_STATUSES } from '@/hooks/useOrders'
import { usePayOrder } from '@/hooks/usePayOrder'
import { errorMessage } from '@/lib/api'
import { formatDate, formatDateTime, money } from '@/lib/format'
import { ErrorState } from '@/components/shared/ErrorState'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { PillButton, pill } from '@/components/auth/form'
import { PayStep } from '@/components/checkout/PayStep'
import { AddressLines } from '@/components/address/AddressCard'
import { OrderItems, OrderTotals } from '@/components/account/OrderItems'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { StatusChip, paymentMethodLabel } from '@/components/account/StatusChip'
import { BuyAgainButton } from '@/components/account/BuyAgainButton'
import { ReturnDialog, returnReasonLabel, returnWindow } from '@/components/account/ReturnDialog'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 font-sans text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-md font-mono text-[12px] text-ink hover:text-accent"
      aria-label={`Copy ${value}`}
    >
      <span className="truncate">{value}</span>
      {copied ? <Check className="size-3.5 shrink-0 text-success" /> : <Copy className="size-3.5 shrink-0 text-muted group-hover:text-accent" />}
    </button>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading order">
      <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
      <div className="mt-5 h-10 w-64 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-80 animate-pulse rounded-[20px] bg-surface-2/70" />
        <div className="h-80 animate-pulse rounded-[20px] bg-surface-2/70" />
      </div>
    </div>
  )
}

const REFUND_LABEL: Record<string, string> = { processed: 'Refunded', pending: 'In progress', failed: 'Being handled manually', manual: 'Handled manually' }

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { order, status, error, refetch, setOrder } = useOrder(id)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [returning, setReturning] = useState(false)
  const pay = usePayOrder({
    onComplete: (o) => {
      setOrder(o)
      useCart.getState().refresh().catch(() => {})
      navigate(`/order/success/${o._id}`)
    },
  })

  // Warm the confirmation page for unpaid orders (retry lands there).
  useEffect(() => { if (order && PAYABLE_STATUSES.includes(order.status)) void import('@/pages/OrderSuccess') }, [order])

  if (status === 'error' && !order) return <ErrorState message={error ?? 'Couldn’t load this order.'} onRetry={refetch} />
  if (!order) return <DetailSkeleton />

  const cod = isCod(order)
  const payable = PAYABLE_STATUSES.includes(order.status)
  const cancellable = CANCELLABLE_STATUSES.includes(order.status)
  const charged = cod ? !!order.payment.paidAt : PAID_STATUSES.includes(order.status)
  const returnUntil = returnWindow(order)
  const method = paymentMethodLabel(cod ? 'cod' : order.payment.method)
  const ref = { id: order._id, orderNumber: order.orderNumber, total: order.total }
  const idle = pay.phase.kind === 'idle'

  const doCancel = async () => {
    setCancelling(true)
    try {
      const updated = await cancelOrder(order._id)
      setOrder(updated)
      setConfirmCancel(false)
      toast.success(charged ? 'Order cancelled — refund started' : 'Order cancelled')
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t cancel this order.'))
      refetch()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div>
      <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"><ArrowLeft className="size-4" />All orders</Link>

      <div className="mt-5 flex flex-col gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[2rem] leading-none font-medium tabular sm:text-[2.6rem]">{order.orderNumber}</h1>
            <StatusChip status={order.status} />
          </div>
          <p className="mt-2 text-[14px] text-muted">Placed on <time dateTime={order.createdAt}>{formatDate(order.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</time> · <span className="tabular">{money(order.total)}</span>{cod ? ' · Cash on delivery' : ''}</p>
        </div>
        {idle ? (
          <div className="flex flex-wrap gap-2">
            {payable ? <PillButton variant="accent" onClick={() => void pay.retry(ref)} loading={pay.busy}><RefreshCw className="size-4" />Retry payment</PillButton> : null}
            {returnUntil ? <PillButton variant="ink" onClick={() => setReturning(true)}><Undo2 className="size-4" />Request return</PillButton> : null}
            <BuyAgainButton orderId={order._id} lineCount={new Set(order.items.map((i) => i.product)).size} variant={payable || returnUntil ? 'outline' : 'ink'} />
            {invoiceable(order) ? <Link to={`/account/orders/${order._id}/invoice`} className={pill('outline')}><FileText className="size-4" />Invoice</Link> : null}
            {cancellable ? <button type="button" onClick={() => setConfirmCancel(true)} className={pill('ghost', 'md', 'text-muted hover:bg-danger/[0.06] hover:text-danger')}>Cancel order</button> : null}
          </div>
        ) : null}
      </div>

      {!idle && pay.phase.kind !== 'done' ? (
        <div className="mt-6">
          <PayStep phase={pay.phase} onOrderPage onRetry={(o) => void pay.retry(o)} onRecheck={(o) => void pay.recheck(o)} onProceed={() => void pay.proceed()} onBack={() => { pay.reset(); refetch() }} />
        </div>
      ) : null}

      {order.status === 'payment_failed' && order.payment.failureReason && idle ? (
        <p className="mt-6 rounded-xl border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm text-ink">Last attempt failed: <span className="text-muted">{order.payment.failureReason}</span></p>
      ) : null}
      {order.return ? (
        <div className="mt-6 flex gap-3 rounded-xl border border-accent/25 bg-accent/[0.05] px-4 py-3.5 text-sm">
          <PackageOpen className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-ink">
            Return requested on {formatDate(order.return.requestedAt)} · <span className="font-medium">{returnReasonLabel(order.return.reason)}</span>
            {order.return.note ? <span className="mt-0.5 block text-muted">“{order.return.note}”</span> : null}
            {order.return.resolvedAt ? <span className="mt-0.5 block text-muted">Resolved {formatDate(order.return.resolvedAt)}.</span> : <span className="mt-0.5 block text-muted">We’ll review it within a day and email you.</span>}
          </p>
        </div>
      ) : returnUntil && idle ? (
        <p className="mt-6 text-[13px] text-muted">Not quite right? You can request a return until {formatDate(returnUntil.toISOString(), { day: 'numeric', month: 'long' })}.</p>
      ) : null}

      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Section title="Items">
            <OrderItems items={order.items} className="-my-3.5" />
            <div className="mt-5 border-t border-line pt-5"><OrderTotals order={order} /></div>
          </Section>
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Delivering to">
              <AddressLines address={order.address} />
              {order.deliveryNote ? (
                <p className="mt-4 flex gap-2 border-t border-line pt-3 text-[13px] leading-snug text-muted"><MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span><span className="font-medium text-ink">Instructions:</span> {order.deliveryNote}</span></p>
              ) : null}
            </Section>
            <Section title="Payment">
              <dl className="-my-2 divide-y divide-line">
                <InfoRow label="Method">{cod ? 'Cash on delivery' : method ? `${method} · Razorpay` : 'Razorpay'}</InfoRow>
                {cod && !order.payment.paidAt && order.status !== 'cancelled' ? <InfoRow label="Due on delivery"><span className="font-medium tabular">{money(order.total)}</span></InfoRow> : null}
                {order.payment.paidAt ? <InfoRow label="Paid">{formatDateTime(order.payment.paidAt)}</InfoRow> : null}
                {order.payment.razorpayPaymentId ? <InfoRow label="Payment ID"><CopyValue value={order.payment.razorpayPaymentId} /></InfoRow> : null}
                {order.payment.razorpayOrderId ? <InfoRow label="Razorpay order"><CopyValue value={order.payment.razorpayOrderId} /></InfoRow> : null}
                {order.payment.refundStatus ? (
                  <InfoRow label="Refund"><span className={order.payment.refundStatus === 'failed' ? 'text-warning' : 'text-success'}>{REFUND_LABEL[order.payment.refundStatus] ?? order.payment.refundStatus}</span></InfoRow>
                ) : null}
              </dl>
            </Section>
          </div>
          {order.giftMessage ? (
            <section className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-5 sm:p-6">
              <div aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-[repeating-linear-gradient(90deg,var(--line)_0_6px,transparent_6px_12px)]" />
              <h2 className="mb-3 flex items-center gap-2 font-sans text-[12px] font-semibold tracking-[0.12em] text-muted uppercase"><Gift className="size-3.5" aria-hidden="true" />Gift message</h2>
              <p className="font-display text-xl leading-snug text-ink italic text-pretty">“{order.giftMessage}”</p>
            </section>
          ) : null}
        </div>
        <Section title="Timeline"><OrderTimeline order={order} /></Section>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={(o) => { if (!cancelling) setConfirmCancel(o) }}>
        <AlertDialogContent className="rounded-[20px] border-line bg-surface p-6 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-medium">Cancel {order.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed text-muted">
              {charged
                ? <>We’ll refund the full <span className="font-medium text-ink tabular">{money(order.total)}</span> to your original payment method. Refunds usually land within 5–7 business days.</>
                : cod ? 'It’s cash on delivery, so there’s nothing to refund. We’ll stop it before it ships.' : 'Nothing has been charged, so there’s nothing to refund. You can always order again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogPrimitive.Cancel className={pill('ghost')} disabled={cancelling}>Keep order</AlertDialogPrimitive.Cancel>
            <PillButton variant="danger" onClick={doCancel} loading={cancelling} loadingText="Cancelling…">Cancel order</PillButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReturnDialog order={order} open={returning} onOpenChange={setReturning} onDone={(o) => { if (o) setOrder(o); else refetch() }} />
    </div>
  )
}
