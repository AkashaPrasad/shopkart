import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, ArrowLeft, Check, Clock3, Lock, PackageX, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderRef, PayPhase } from '@/hooks/usePayOrder'
import { EASE, PillButton, Spinner, pill } from '@/components/auth/form'

type Tone = 'neutral' | 'danger' | 'warning' | 'success'
const medallion: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/12 text-warning',
  success: 'bg-success/10 text-success',
}

function Panel({ tone = 'neutral', icon, title, children, actions, live, focus = true }: { tone?: Tone; icon: ReactNode; title: ReactNode; children?: ReactNode; actions?: ReactNode; live?: boolean; focus?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const reduce = useReducedMotion()
  // Move focus to the outcome so keyboard/screen-reader users hear it — but never while Razorpay's iframe owns focus.
  useEffect(() => { if (focus) ref.current?.focus({ preventScroll: true }) }, [title, focus])
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn('rounded-[20px] border bg-surface p-5 sm:p-7', tone === 'danger' ? 'border-danger/25' : tone === 'warning' ? 'border-warning/30' : 'border-line')}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
    >
      <div className="flex items-start gap-4">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', medallion[tone])}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 ref={ref} tabIndex={-1} className="font-display text-[1.6rem] leading-tight font-medium outline-none">{title}</h2>
          {children ? <div className="mt-2 text-[15px] leading-relaxed text-muted text-pretty">{children}</div> : null}
        </div>
      </div>
      {actions ? <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div> : null}
    </motion.div>
  )
}

const PROGRESS = [
  { key: 'creating', label: 'Saving your order' },
  { key: 'awaiting', label: 'Payment window' },
  { key: 'verifying', label: 'Confirming payment' },
] as const

function ProgressList({ phase }: { phase: PayPhase['kind'] }) {
  const at = phase === 'creating' ? 0 : phase === 'opening' || phase === 'awaiting' ? 1 : 2
  return (
    <ol className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
      {PROGRESS.map((p, i) => (
        <li key={p.key} className="flex items-center gap-3 text-sm">
          <span className={cn('grid size-5 place-items-center rounded-full transition-colors', i < at ? 'bg-ink text-bg' : i === at ? 'text-ink' : 'border border-line')}>
            {i < at ? <Check className="size-3" strokeWidth={3} /> : i === at ? <Spinner className="size-4" /> : null}
          </span>
          <span className={i <= at ? 'text-ink' : 'text-muted'}>{p.label}</span>
        </li>
      ))}
    </ol>
  )
}

export interface PayStepProps {
  phase: PayPhase
  onRetry: (order: OrderRef) => void
  onRecheck: (order: OrderRef) => void
  onProceed: () => void
  /** Restart checkout when no order exists yet (e.g. network error while creating it). */
  onRestart?: () => void
  /** Return to the review step. */
  onBack?: () => void
  /** Refresh the bag and return to review (total changed). */
  onReviewBag?: () => void
  /** Hide "View order" links (when already on the order page). */
  onOrderPage?: boolean
}

const orderLink = (o: OrderRef) => `/account/orders/${o.id}`

/** Every state of taking a payment, rendered calmly. Shared by checkout, success and order detail. */
export function PayStep({ phase, onRetry, onRecheck, onProceed, onRestart, onBack, onReviewBag, onOrderPage }: PayStepProps) {
  const back = onBack ? (
    <button type="button" onClick={onBack} className={pill('ghost', 'md', 'text-muted hover:text-ink')}><ArrowLeft className="size-4" />Back to review</button>
  ) : null
  const viewOrder = (o: OrderRef) => (onOrderPage ? null : <Link to={orderLink(o)} className={pill('outline')}>View order</Link>)

  switch (phase.kind) {
    case 'idle':
      return null
    case 'creating':
    case 'opening':
    case 'awaiting':
    case 'verifying': {
      const copy = {
        creating: phase.kind === 'creating' && phase.cod
          ? { title: 'Placing your order…', body: 'Checking stock and prices one last time.' }
          : { title: phase.kind === 'creating' && phase.order ? 'Preparing a fresh payment…' : 'Locking in your order…', body: 'Checking stock and prices one last time.' },
        opening: { title: 'Opening secure payment…', body: 'Razorpay’s window will appear in a moment.' },
        awaiting: { title: 'Finish paying in the Razorpay window', body: 'Card, UPI or netbanking — whatever’s easiest. We’ll take it from there.' },
        verifying: { title: 'Confirming your payment…', body: 'Just a few seconds. Please don’t refresh or close this tab.' },
      }[phase.kind]
      return (
        <Panel live focus={false} icon={phase.kind === 'verifying' ? <ShieldCheck className="size-5" /> : <Lock className="size-5" />} title={copy.title}>
          {copy.body}
          {'order' in phase && phase.order ? <p className="mt-1 text-[13px]">Order <span className="font-medium text-ink tabular">{phase.order.orderNumber}</span> · <span className="tabular">{money(phase.order.total)}</span></p> : null}
          {phase.kind === 'creating' && phase.cod ? null : <ProgressList phase={phase.kind} />}
        </Panel>
      )
    }
    case 'dismissed':
      return (
        <Panel
          icon={<Clock3 className="size-5" />}
          title="Payment not completed"
          actions={<>
            <PillButton variant="accent" onClick={() => onRetry(phase.order)}><RefreshCw className="size-4" />Retry payment · {money(phase.order.total)}</PillButton>
            {viewOrder(phase.order)}
            {back}
          </>}
        >
          No worries — your order <span className="font-medium text-ink tabular">{phase.order.orderNumber}</span> is saved. Retry now, or pay later from <Link to="/account/orders" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">Orders</Link>.
        </Panel>
      )
    case 'failed':
      return (
        <Panel
          tone="danger"
          icon={<XCircle className="size-5" />}
          title="Payment failed"
          actions={<>
            <PillButton variant="accent" onClick={() => onRetry(phase.order)}><RefreshCw className="size-4" />Try again · {money(phase.order.total)}</PillButton>
            {viewOrder(phase.order)}
            {back}
          </>}
        >
          <span className="text-ink">{phase.description}</span>
          <span className="mt-1 block text-[14px]">Order <span className="tabular">{phase.order.orderNumber}</span> is saved. If any amount was debited, your bank reverses it automatically. Another card or UPI usually does the trick.</span>
        </Panel>
      )
    case 'unconfirmed':
      return (
        <Panel
          tone="warning"
          icon={<AlertTriangle className="size-5" />}
          title="Still confirming your payment"
          actions={<>
            <PillButton variant="ink" onClick={() => onRecheck(phase.order)}><RefreshCw className="size-4" />Check again</PillButton>
            {viewOrder(phase.order)}
          </>}
        >
          Razorpay said yes, but we couldn’t reach our server to confirm it. <span className="text-ink">Please don’t pay again</span> — order <span className="tabular">{phase.order.orderNumber}</span> will update on its own within a few minutes.
        </Panel>
      )
    case 'stock':
      return (
        <Panel
          tone="warning"
          icon={<PackageX className="size-5" />}
          title="A few things changed in your bag"
          actions={<>
            <Link to="/cart" className={pill('ink')}>Go to cart</Link>
            {back}
          </>}
        >
          {phase.message || 'Some items sold out or changed while you were checking out.'} You haven’t been charged.
          {phase.issues.length ? (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {phase.issues.map((i) => (
                <li key={i.productId} className="flex items-start justify-between gap-3 px-3.5 py-3 text-sm">
                  <span className="min-w-0">
                    {i.slug ? <Link to={`/product/${i.slug}`} className="font-medium text-ink hover:underline">{i.name ?? 'An item'}</Link> : <span className="font-medium text-ink">{i.name ?? 'An item'}</span>}
                    <span className="block text-[13px] text-muted">{i.message}</span>
                  </span>
                  {typeof i.requestedQty === 'number' ? (
                    <span className="shrink-0 text-right text-[12px] text-muted tabular">wanted {i.requestedQty}<br />{i.availableQty ? `${i.availableQty} available` : 'none left'}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      )
    case 'total_changed':
      return (
        <Panel
          tone="warning"
          icon={<AlertTriangle className="size-5" />}
          title="Your total changed"
          actions={<>
            <PillButton variant="accent" onClick={onProceed}>Pay {money(phase.order.total)}</PillButton>
            {onReviewBag ? <button type="button" onClick={onReviewBag} className={pill('ghost')}>Review my bag</button> : null}
          </>}
        >
          Prices updated since this page loaded. Your new total is <span className="font-semibold text-ink tabular">{money(phase.order.total)}</span> (was <span className="tabular line-through">{money(phase.shown)}</span>). Nothing has been charged.
        </Panel>
      )
    case 'error':
      return (
        <Panel
          tone="danger"
          icon={<AlertTriangle className="size-5" />}
          title="That didn’t go through"
          actions={<>
            {phase.order
              ? <PillButton variant="ink" onClick={() => onRetry(phase.order!)}><RefreshCw className="size-4" />Try again</PillButton>
              : onRestart ? <PillButton variant="ink" onClick={onRestart}><RefreshCw className="size-4" />Try again</PillButton> : null}
            {phase.order ? viewOrder(phase.order) : null}
            {back}
          </>}
        >
          {phase.message}
          {phase.order ? <span className="mt-1 block text-[14px]">Your order <span className="tabular">{phase.order.orderNumber}</span> is saved and you haven’t been charged.</span> : null}
        </Panel>
      )
    case 'done':
      return (
        <Panel tone="success" icon={<Check className="size-5" />} title={phase.order.payment?.provider === 'cod' ? 'Order placed' : 'Payment confirmed'} live focus={false}>
          Taking you to your order…
        </Panel>
      )
  }
}
