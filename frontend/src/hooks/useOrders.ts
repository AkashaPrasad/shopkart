import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { Order, OrderStatus, Paginated } from '@/types'

/** Order as the API returns it, including refund bookkeeping added on cancellation. */
export type OrderDetail = Order & {
  payment: Order['payment'] & { refundId?: string; refundStatus?: 'pending' | 'processed' | 'failed' }
  updatedAt?: string
}

export const PAID_STATUSES: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered']
export const PAYABLE_STATUSES: OrderStatus[] = ['pending_payment', 'payment_failed']
export const CANCELLABLE_STATUSES: OrderStatus[] = ['pending_payment', 'paid', 'processing']

type Status = 'loading' | 'ready' | 'error'

/** GET a resource with abort-on-change; keeps the last data while refetching so lists don't flash. */
function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!path) return
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setStatus('loading')
    setError(null)
    api.get<T>(path, { signal: c.signal })
      .then((d) => { if (!c.signal.aborted) { setData(d); setStatus('ready') } })
      .catch((e: unknown) => {
        if (c.signal.aborted || (e as Error)?.name === 'AbortError') return
        setError(errorMessage(e, 'Couldn’t load this right now.'))
        setStatus('error')
      })
    return () => c.abort()
  }, [path, nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])
  return { data, setData, status, error, refetch }
}

export function useOrders(page = 1, limit = 10) {
  const r = useResource<Paginated<OrderDetail>>(`/orders?page=${page}&limit=${limit}`)
  return { data: r.data, status: r.status, error: r.error, refetch: r.refetch }
}

export function useOrder(id: string | undefined) {
  const r = useResource<{ order: OrderDetail }>(id ? `/orders/${id}` : null)
  const setOrder = useCallback((order: OrderDetail) => r.setData({ order }), [r.setData]) // eslint-disable-line react-hooks/exhaustive-deps
  return { order: r.data?.order ?? null, status: r.status, error: r.error, refetch: r.refetch, setOrder }
}

export async function cancelOrder(id: string) {
  const { order } = await api.post<{ order: OrderDetail }>(`/orders/${id}/cancel`)
  return order
}

/**
 * Cancels an order this checkout session created but the customer abandoned in favour of a newer one.
 * Only touches orders that are still `pending_payment` (never anything paid), and never throws.
 */
export async function cancelIfStillPending(id: string) {
  try {
    const { order } = await api.get<{ order: OrderDetail }>(`/orders/${id}`)
    if (order.status === 'pending_payment') await api.post(`/orders/${id}/cancel`)
  } catch { /* best effort */ }
}

export const isCod = (o: Pick<OrderDetail, 'payment' | 'paymentMethod'>) => o.paymentMethod === 'cod' || o.payment?.provider === 'cod'

export interface ReorderSkip { productId?: string; name: string | null; reason: string; requestedQty?: number; addedQty?: number }

export async function reorder(id: string) {
  return api.post<{ cart: unknown; skipped?: ReorderSkip[] }>(`/orders/${id}/reorder`)
}

/** "Holo Cat Sticker Pack — sold out", "Gel Pen Trio — only 2 added". */
export function describeSkip(s: ReorderSkip) {
  const name = s.name ?? 'An item'
  switch (s.reason) {
    case 'out_of_stock': return `${name} — sold out`
    case 'unavailable': return `${name} — no longer available`
    case 'insufficient_stock': return s.addedQty ? `${name} — only ${s.addedQty} added (limited stock)` : `${name} — not enough stock`
    case 'max_qty': return `${name} — capped at 10 per order`
    default: return `${name} — ${s.reason.replaceAll('_', ' ')}`
  }
}

/** Mirrors the API rule: an invoice exists once money moved (paidAt) or a COD order is confirmed and not cancelled. */
export function invoiceable(o: OrderDetail) {
  if (PAYABLE_STATUSES.includes(o.status)) return false
  if (o.status === 'cancelled') return !!o.payment.paidAt
  return !!o.payment.paidAt || isCod(o)
}
