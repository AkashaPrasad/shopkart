import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, errorMessage } from '@/lib/api'
import { loadRazorpay, openRazorpay, type RazorpayFailure, type RazorpaySuccess } from '@/hooks/useRazorpay'
import type { RazorpayCheckoutInfo } from '@/types'
import { PAID_STATUSES, type OrderDetail } from '@/hooks/useOrders'

/** The minimum we need to talk about an order while paying for it. */
export interface OrderRef { id: string; orderNumber: string; total: number }

export interface StockIssue {
  productId: string
  slug: string | null
  name: string | null
  reason: 'unavailable' | 'out_of_stock' | 'insufficient_stock' | 'max_qty' | string
  message: string
  requestedQty?: number
  availableQty?: number
}

export type PayPhase =
  | { kind: 'idle' }
  /** Creating the order (checkout) or a fresh Razorpay order (retry). `cod` = placing a cash-on-delivery order. */
  | { kind: 'creating'; order?: OrderRef; cod?: boolean }
  /** Loading Checkout.js / opening the modal. */
  | { kind: 'opening'; order: OrderRef }
  /** Razorpay modal is open. */
  | { kind: 'awaiting'; order: OrderRef }
  | { kind: 'verifying'; order: OrderRef }
  /** Server confirmed the payment (the order may still be `cancelled` if stock vanished mid-payment — callers route on status). */
  | { kind: 'done'; order: OrderDetail }
  | { kind: 'failed'; order: OrderRef; description: string }
  | { kind: 'dismissed'; order: OrderRef }
  /** Razorpay said success but we couldn't reach the server to confirm. Money may have moved — never say "failed". */
  | { kind: 'unconfirmed'; order: OrderRef }
  | { kind: 'stock'; issues: StockIssue[]; order?: OrderRef; message: string }
  /** Server's total differs from what the customer was shown; ask before charging. */
  | { kind: 'total_changed'; order: OrderRef; info: RazorpayCheckoutInfo; shown: number }
  | { kind: 'error'; message: string; order?: OrderRef }

export const BUSY_PHASES: PayPhase['kind'][] = ['creating', 'opening', 'awaiting', 'verifying']

type RzpInstance = ReturnType<typeof openRazorpay>

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const toRef = (o: Pick<OrderDetail, '_id' | 'orderNumber' | 'total'>): OrderRef => ({ id: o._id, orderNumber: o.orderNumber, total: o.total })

/** Razorpay's checkout only skips its contact screen for E.164 numbers; the API stores 10-digit Indian mobiles. */
function withPrefill(info: RazorpayCheckoutInfo): RazorpayCheckoutInfo {
  const raw = info.prefill?.contact ?? ''
  const digits = raw.replace(/\D/g, '')
  const contact = /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : raw || undefined
  return { ...info, prefill: { ...info.prefill, ...(contact ? { contact } : {}) } }
}

/** Razorpay often says just "Payment failed". Turn generic failures into something a customer can act on. */
function describeFailure(r: RazorpayFailure | undefined): string {
  const desc = r?.error?.description?.trim() ?? ''
  if (desc && !/^payment (has )?failed\.?$/i.test(desc) && !/^undefined$/i.test(desc)) return desc
  switch (r?.error?.reason) {
    case 'authentication_failed': return 'Your bank couldn’t verify this payment (OTP or 3-D Secure step).'
    case 'payment_cancelled': return 'The payment was cancelled before it completed.'
    case 'insufficient_funds': return 'The account didn’t have enough balance for this payment.'
    case 'card_declined':
    case 'payment_declined': return 'Your card was declined by the bank.'
    case 'payment_timed_out': return 'The payment timed out before the bank responded.'
    default: return 'Your bank didn’t approve this payment.'
  }
}

export function parseStockIssues(e: unknown): StockIssue[] {
  if (!(e instanceof ApiError)) return []
  const issues = (e.details as { issues?: unknown } | undefined)?.issues
  return Array.isArray(issues) ? (issues as StockIssue[]) : []
}

export interface CheckoutBody {
  addressId: string
  coupon?: string | null
  paymentMethod?: 'razorpay' | 'cod'
  deliveryNote?: string
  giftMessage?: string
}

interface Options {
  /** Called once the server has confirmed a payment (status paid, or cancelled+refund if stock ran out). */
  onComplete: (order: OrderDetail) => void
  /** Called for non-retryable 4xx errors at checkout (empty cart, bad address, invalid coupon). */
  onRejected?: (error: ApiError) => void
}

/**
 * The one implementation of "take money for an order" used by checkout, the success page and order detail.
 * - Double-submit safe (`pendingRef` is set synchronously before any await).
 * - Every Razorpay callback is settled at most once per attempt (success / failure / dismiss race).
 * - Verification retries on network errors and falls back to reading the order before reporting anything.
 */
export function usePayOrder({ onComplete, onRejected }: Options) {
  const [phase, setPhase] = useState<PayPhase>({ kind: 'idle' })
  const pendingRef = useRef(false)
  const rzpRef = useRef<RzpInstance | null>(null)
  /** Razorpay's signed success payload per order, kept so "Check again" can re-send it if verification never reached us. */
  const successRef = useRef<Map<string, RazorpaySuccess>>(new Map())
  const mounted = useRef(true)
  const cbs = useRef({ onComplete, onRejected })
  cbs.current = { onComplete, onRejected }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      pendingRef.current = false
      // Leaving the page mid-payment: close the modal quietly; the order stays saved as pending.
      try { rzpRef.current?.close() } catch { /* already closed */ }
      rzpRef.current = null
    }
  }, [])

  const update = useCallback((p: PayPhase) => { if (mounted.current) setPhase(p) }, [])
  const settle = useCallback((p: PayPhase) => { pendingRef.current = false; rzpRef.current = null; update(p) }, [update])

  const confirmFromServer = useCallback(async (order: OrderRef): Promise<OrderDetail | null> => {
    try {
      const { order: fresh } = await api.get<{ order: OrderDetail }>(`/orders/${order.id}`)
      return fresh
    } catch { return null }
  }, [])

  const verify = useCallback(async (order: OrderRef, r: RazorpaySuccess) => {
    update({ kind: 'verifying', order })
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { order: confirmed } = await api.post<{ order: OrderDetail }>(`/orders/${order.id}/verify`, {
          razorpay_order_id: r.razorpay_order_id,
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_signature: r.razorpay_signature,
        })
        settle({ kind: 'done', order: confirmed })
        if (mounted.current) cbs.current.onComplete(confirmed)
        return
      } catch (e) {
        lastError = e
        // 4xx is a definitive answer (e.g. bad signature → order marked payment_failed). Don't retry it.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) break
        await sleep(700 * (attempt + 1))
      }
    }
    // Before telling the customer anything, ask the server what actually happened (the webhook may have won).
    const fresh = await confirmFromServer(order)
    if (fresh && (PAID_STATUSES.includes(fresh.status) || (fresh.status === 'cancelled' && fresh.payment.razorpayPaymentId))) {
      settle({ kind: 'done', order: fresh })
      if (mounted.current) cbs.current.onComplete(fresh)
      return
    }
    if (lastError instanceof ApiError && lastError.status >= 400 && lastError.status < 500) {
      settle({ kind: 'failed', order, description: lastError.message || 'We couldn’t verify that payment.' })
      return
    }
    settle({ kind: 'unconfirmed', order })
  }, [confirmFromServer, settle, update])

  const open = useCallback(async (order: OrderRef, info: RazorpayCheckoutInfo) => {
    update({ kind: 'opening', order })
    try {
      await loadRazorpay()
    } catch (e) {
      settle({ kind: 'error', order, message: errorMessage(e, 'Couldn’t load the payment window. Check your connection and try again.') })
      return
    }
    if (!mounted.current) { pendingRef.current = false; return }
    let settled = false
    try {
      rzpRef.current = openRazorpay(withPrefill(info), {
        description: `Order ${order.orderNumber}`,
        onSuccess: (r) => {
          if (settled) return
          settled = true
          rzpRef.current = null
          successRef.current.set(order.id, r)
          void verify(order, r)
        },
        onFailure: (r: RazorpayFailure) => {
          if (settled) return
          settled = true
          const description = describeFailure(r)
          settle({ kind: 'failed', order, description })
          // Best effort: the webhook records failures too, and markPaymentFailed never downgrades a paid order.
          api.post(`/orders/${order.id}/payment-failed`, { reason: description.slice(0, 280) }).catch(() => {})
        },
        onDismiss: () => {
          if (settled) return
          settled = true
          settle({ kind: 'dismissed', order })
        },
      })
      update({ kind: 'awaiting', order })
    } catch (e) {
      settle({ kind: 'error', order, message: errorMessage(e, 'Couldn’t open the payment window.') })
    }
  }, [settle, update, verify])

  /**
   * Places a new order from the server cart. Online: opens Razorpay. COD: the order is final immediately.
   * `shownTotal` is what the customer saw (incl. any COD fee) and guards against silent price changes.
   */
  const checkout = useCallback(async (body: CheckoutBody, shownTotal: number) => {
    if (pendingRef.current) return
    pendingRef.current = true
    const cod = body.paymentMethod === 'cod'
    update({ kind: 'creating', cod })
    let created: { order: OrderDetail; razorpay?: RazorpayCheckoutInfo }
    try {
      created = await api.post<{ order: OrderDetail; razorpay?: RazorpayCheckoutInfo }>('/orders/checkout', {
        addressId: body.addressId,
        // Always explicit: the order gets exactly the coupon the customer saw (null = none).
        coupon: body.coupon ?? null,
        paymentMethod: body.paymentMethod ?? 'razorpay',
        ...(body.deliveryNote?.trim() ? { deliveryNote: body.deliveryNote.trim() } : {}),
        ...(body.giftMessage?.trim() ? { giftMessage: body.giftMessage.trim() } : {}),
      })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) settle({ kind: 'stock', issues: parseStockIssues(e), message: e.message })
      else if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
        settle({ kind: 'idle' })
        cbs.current.onRejected?.(e)
      } else settle({ kind: 'error', message: errorMessage(e) })
      return
    }
    if (cod) {
      if (created.razorpay) {
        // The server ignored the COD choice and wants an online payment. Never open a payment window the customer didn't ask for.
        api.post(`/orders/${created.order._id}/cancel`).catch(() => {})
        settle({ kind: 'error', message: 'Cash on delivery isn’t available for this order right now. Please choose “Pay online”, or try again shortly.' })
        return
      }
      settle({ kind: 'done', order: created.order })
      if (mounted.current) cbs.current.onComplete(created.order)
      return
    }
    // What Razorpay will actually charge is the source of truth for the "your total changed" check.
    if (!created.razorpay) {
      settle({ kind: 'error', order: toRef(created.order), message: 'We saved your order but couldn’t start the payment. Try again in a moment.' })
      return
    }
    const ref = { ...toRef(created.order), total: created.razorpay.amount }
    if (created.razorpay.amount !== shownTotal) {
      settle({ kind: 'total_changed', order: ref, info: created.razorpay, shown: shownTotal })
      return
    }
    await open(ref, created.razorpay)
  }, [open, settle, update])

  /** Fresh Razorpay order for an existing unpaid order (dismissed / failed / pay later). */
  const retry = useCallback(async (order: OrderRef) => {
    if (pendingRef.current) return
    pendingRef.current = true
    update({ kind: 'creating', order })
    try {
      const { razorpay } = await api.post<{ razorpay: RazorpayCheckoutInfo }>(`/orders/${order.id}/retry-payment`)
      await open({ ...order, total: razorpay.amount }, razorpay)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && parseStockIssues(e).length) settle({ kind: 'stock', issues: parseStockIssues(e), order, message: e.message })
      else settle({ kind: 'error', order, message: errorMessage(e) })
    }
  }, [open, settle, update])

  /** Customer accepted a changed total: open the Razorpay order we already created. */
  const proceed = useCallback(async () => {
    if (phase.kind !== 'total_changed' || pendingRef.current) return
    pendingRef.current = true
    await open(phase.order, phase.info)
  }, [open, phase])

  /** Re-check an unconfirmed payment: re-send the signed payload (verify is idempotent), else read the order. */
  const recheck = useCallback(async (order: OrderRef) => {
    if (pendingRef.current) return
    pendingRef.current = true
    const saved = successRef.current.get(order.id)
    if (saved) { await verify(order, saved); return }
    update({ kind: 'verifying', order })
    const fresh = await confirmFromServer(order)
    if (fresh && (PAID_STATUSES.includes(fresh.status) || (fresh.status === 'cancelled' && fresh.payment.razorpayPaymentId))) {
      settle({ kind: 'done', order: fresh })
      if (mounted.current) cbs.current.onComplete(fresh)
    } else settle({ kind: 'unconfirmed', order })
  }, [confirmFromServer, settle, update, verify])

  const reset = useCallback(() => { if (!pendingRef.current) setPhase({ kind: 'idle' }) }, [])

  return { phase, busy: BUSY_PHASES.includes(phase.kind), checkout, retry, proceed, recheck, reset }
}
