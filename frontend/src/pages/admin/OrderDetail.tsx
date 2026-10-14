import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Ban, Check, Gift, Mail, MessageSquareText, Undo2, X } from 'lucide-react'
import { ADMIN_CANCELLABLE, NEXT_STEP, RETURN_REASON_LABELS, isCod, paidOnline, unitCount, useAdminOrder } from '@/hooks/useAdmin'
import { formatDate, formatDateTime, money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminOrder, AdminOrderStatus } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormBanner, PillButton, pill } from '@/components/auth/form'
import { AddressLines, formatPhone } from '@/components/address/AddressCard'
import { OrderItems } from '@/components/account/OrderItems'
import { paymentMethodLabel } from '@/components/account/StatusChip'
import { AdminBadge, Panel } from '@/components/admin/AdminPageHeader'
import { AdminStatusChip, AdminTimeline, PaymentTag } from '@/components/admin/OrderStatus'
import { CopyValue, InfoRow } from '@/components/admin/Bits'
import { StatusDialog, useOrderTransition } from '@/components/admin/OrderActions'

type Dialog = null | 'cancel' | 'approve' | 'reject'

function Totals({ order }: { order: AdminOrder }) {
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal · {plural(unitCount(order), 'item')}</dt><dd className="tabular">{money(order.subtotal)}</dd></div>
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

const REFUND_COPY: Record<string, { text: string; tone: string }> = {
  processed: { text: 'Refunded', tone: 'text-success' },
  pending: { text: 'Refund in progress', tone: 'text-success' },
  failed: { text: 'Refund failed — retry in Razorpay', tone: 'text-danger' },
  manual: { text: 'Refund manually (cash)', tone: 'text-warning' },
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading order">
      <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
      <div className="mt-5 h-10 w-64 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-96 animate-pulse rounded-[20px] bg-surface-2/70" />
        <div className="h-96 animate-pulse rounded-[20px] bg-surface-2/70" />
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const location = useLocation()
  const back = (location.state as { back?: string } | null)?.back
  const backHref = back && back.startsWith('/admin') ? back : '/admin/orders'
  const backLabel = backHref.startsWith('/admin/returns') ? 'Returns' : 'All orders'

  const { order, status, error, refetch, setOrder } = useAdminOrder(id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const onUpdated = useCallback((o: AdminOrder) => setOrder(o), [setOrder])
  const { run, pending, conflict, clearConflict } = useOrderTransition({ onUpdated, onConflict: refetch })

  if (status === 'error' && !order) {
    return (
      <div>
        <Link to={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"><ArrowLeft className="size-4" />{backLabel}</Link>
        <div className="mt-6"><ErrorState message={error ?? 'Couldn’t load this order.'} onRetry={refetch} /></div>
      </div>
    )
  }
  if (!order) return <DetailSkeleton />

  const cod = isCod(order)
  const next = NEXT_STEP[order.status]
  const cancellable = ADMIN_CANCELLABLE.includes(order.status)
  const returnRequested = order.status === 'return_requested'
  const busy = !!pending
  const busyTo = pending?.to
  const onlinePaid = paidOnline(order)
  const method = cod ? 'Cash on delivery' : paymentMethodLabel(order.payment.method)
  const refund = order.payment.refundStatus ? REFUND_COPY[order.payment.refundStatus] : null

  const go = async (to: AdminOrderStatus, note?: string) => {
    clearConflict()
    if (await run(order, to, note)) setDialog(null)
  }
  const nextLabel = next && next.to === 'delivered' && cod ? 'Mark delivered · cash collected' : next?.label

  return (
    <div>
      <Seo title={`${order.orderNumber} · Admin`} />
      <Link to={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"><ArrowLeft className="size-4" />{backLabel}</Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2"><AdminBadge /><PaymentTag cod={cod} /></div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[2rem] leading-none font-medium tabular sm:text-[2.6rem]">{order.orderNumber}</h1>
            <AdminStatusChip status={order.status} />
          </div>
          <p className="mt-2 text-[14px] text-muted">
            Placed <time dateTime={order.createdAt}>{formatDate(order.createdAt, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time> · <span className="tabular">{money(order.total)}</span> · {plural(unitCount(order), 'item')}
          </p>
        </div>

        {next || cancellable || returnRequested ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end" role="group" aria-label="Order actions">
            {returnRequested ? (
              <>
                <PillButton variant="accent" onClick={() => setDialog('approve')} disabled={busy}><Check className="size-4" />Approve return</PillButton>
                <button type="button" onClick={() => setDialog('reject')} disabled={busy} className={pill('outline')}><X className="size-4" />Reject return</button>
              </>
            ) : null}
            {next ? (
              <PillButton variant="accent" onClick={() => void go(next.to)} loading={busyTo === next.to} loadingText="Updating…" disabled={busy}>
                {nextLabel}<ArrowRight className="size-4" />
              </PillButton>
            ) : null}
            {cancellable ? (
              <button type="button" onClick={() => setDialog('cancel')} disabled={busy} className={pill('outline', 'md', 'hover:border-danger/40 hover:text-danger')}>
                <Ban className="size-4" />Cancel order
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {next?.to === 'delivered' && cod ? (
        <p className="mt-3 text-[13px] text-muted lg:text-right">Marking delivered also records <span className="font-medium text-ink tabular">{money(order.total)}</span> as cash collected.</p>
      ) : null}

      <div className="mt-5">
        <FormBanner show={!!conflict} tone="warning" title="That change didn’t go through" action={<button type="button" onClick={clearConflict} className="text-[13px] font-medium text-ink underline underline-offset-2">Dismiss</button>}>
          {conflict} We’ve loaded the latest status — check it and try again.
        </FormBanner>
      </div>

      {order.return ? (
        <section className={cn('mt-5 rounded-[20px] border p-5 sm:p-6', returnRequested ? 'border-accent/35 bg-accent/[0.05]' : 'border-line bg-surface')} aria-label="Return request">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent ring-1 ring-line" aria-hidden="true"><Undo2 className="size-4" /></span>
              <div>
                <h2 className="font-sans text-[15px] font-semibold text-ink">{returnRequested ? 'Return requested' : order.status === 'returned' ? 'Return approved' : 'Return rejected'}</h2>
                <p className="mt-0.5 text-sm text-muted">{RETURN_REASON_LABELS[order.return.reason] ?? order.return.reason} · <time dateTime={order.return.requestedAt}>{formatDateTime(order.return.requestedAt)}</time></p>
              </div>
            </div>
            {order.return.resolvedAt ? <p className="text-[13px] text-muted">Resolved {formatDateTime(order.return.resolvedAt)}</p> : null}
          </div>
          {order.return.note ? <blockquote className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink text-pretty">“{order.return.note}”</blockquote> : null}
        </section>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Items">
            <OrderItems items={order.items} className="-my-3.5" />
            <div className="mt-5 border-t border-line pt-5"><Totals order={order} /></div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Customer">
              {order.user?.email ? (
                <div className="text-sm">
                  <p className="font-medium text-ink">{order.user.name || 'Unnamed'}</p>
                  <a href={`mailto:${order.user.email}`} className="mt-1 inline-flex max-w-full items-center gap-1.5 text-muted hover:text-ink"><Mail className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{order.user.email}</span></a>
                  {order.address?.phone ? <p className="mt-1 text-muted tabular">{formatPhone(order.address.phone)}</p> : null}
                  <Link to={`/admin/orders?q=${encodeURIComponent(order.user.email)}`} className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink underline-offset-2 hover:underline">
                    All orders from this customer<ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted">This customer deleted their account. The order is kept for records.</p>
              )}
            </Panel>
            <Panel title="Delivering to">
              <AddressLines address={order.address} />
            </Panel>
          </div>

          {order.deliveryNote || order.giftMessage ? (
            <div className="grid gap-4 md:grid-cols-2">
              {order.deliveryNote ? (
                <Panel title="Delivery instructions">
                  <p className="flex gap-2.5 text-sm leading-relaxed text-ink text-pretty"><MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />{order.deliveryNote}</p>
                </Panel>
              ) : null}
              {order.giftMessage ? (
                <Panel title="Gift message">
                  <p className="flex gap-2.5 font-display text-[17px] leading-snug text-ink italic text-pretty"><Gift className="mt-1 size-4 shrink-0 text-accent not-italic" aria-hidden="true" />“{order.giftMessage}”</p>
                </Panel>
              ) : null}
            </div>
          ) : null}

          <Panel title="Payment">
            <dl className="-my-2.5 divide-y divide-line">
              <InfoRow label="Method">{method ? (cod ? method : `${method} · Razorpay`) : 'Razorpay'}</InfoRow>
              {order.payment.paidAt ? <InfoRow label={cod ? 'Cash collected' : 'Paid'}>{formatDateTime(order.payment.paidAt)}</InfoRow> : <InfoRow label="Paid"><span className="text-muted">{cod ? 'On delivery' : 'Not yet'}</span></InfoRow>}
              {order.payment.razorpayPaymentId ? <InfoRow label="Payment ID"><CopyValue value={order.payment.razorpayPaymentId} label="payment ID" /></InfoRow> : null}
              {order.payment.razorpayOrderId ? <InfoRow label="Razorpay order"><CopyValue value={order.payment.razorpayOrderId} label="Razorpay order ID" /></InfoRow> : null}
              {order.payment.failureReason ? <InfoRow label="Last failure"><span className="text-danger">{order.payment.failureReason}</span></InfoRow> : null}
              {refund ? <InfoRow label="Refund"><span className={refund.tone}>{refund.text}</span></InfoRow> : null}
              {order.payment.refundId ? <InfoRow label="Refund ID"><CopyValue value={order.payment.refundId} label="refund ID" /></InfoRow> : null}
            </dl>
          </Panel>
        </div>

        <Panel title="Timeline" className="xl:self-start">
          <AdminTimeline order={order} />
        </Panel>
      </div>

      <StatusDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => setDialog(o ? 'cancel' : null)}
        title={`Cancel ${order.orderNumber}?`}
        description={
          onlinePaid
            ? <>Stock goes back on the shelf and <span className="font-medium text-ink tabular">{money(order.total)}</span> is refunded to the customer’s original payment method via Razorpay.</>
            : cod
              ? 'Stock goes back on the shelf. Nothing has been collected for this cash-on-delivery order, so there’s nothing to refund.'
              : 'Nothing has been charged, so there’s nothing to refund. Any reserved stock goes back on the shelf.'
        }
        notePlaceholder="e.g. Customer asked to cancel by email"
        confirmLabel="Cancel order"
        busyLabel="Cancelling…"
        tone="danger"
        busy={busyTo === 'cancelled'}
        onConfirm={(note) => void go('cancelled', note)}
      />
      <StatusDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => setDialog(o ? 'approve' : null)}
        title={`Approve return for ${order.orderNumber}?`}
        description={
          cod
            ? <>The order becomes <b className="font-medium text-ink">Returned</b>. It was paid in cash, so refund <span className="font-medium text-ink tabular">{money(order.total)}</span> to the customer manually.</>
            : <>The order becomes <b className="font-medium text-ink">Returned</b> and <span className="font-medium text-ink tabular">{money(order.total)}</span> is refunded via Razorpay to the original payment method.</>
        }
        notePlaceholder="e.g. Pickup arranged for Friday"
        confirmLabel="Approve return"
        busyLabel="Approving…"
        tone="accent"
        busy={busyTo === 'returned'}
        onConfirm={(note) => void go('returned', note)}
      />
      <StatusDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => setDialog(o ? 'reject' : null)}
        title="Reject this return?"
        description="The order goes back to Delivered and nothing is refunded. Tell the customer why — they’ll see this note on their order."
        noteLabel="Reason for the customer"
        noteRequired
        notePlaceholder="e.g. Return window closed on 12 Oct"
        confirmLabel="Reject return"
        busyLabel="Rejecting…"
        tone="ink"
        busy={busyTo === 'delivered'}
        onConfirm={(note) => void go('delivered', note)}
      />
    </div>
  )
}
