import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { AdminCustomer, AdminMessage, AdminOrder, AdminOrderStatus, AdminProductPatch, AdminReview, AdminStats, AdminSubscriber, Category, Coupon, Paginated, PaymentMethod, Product } from '@/types'

/* ----------------------------------------------------------------------------
 * Typed fetchers for every /admin endpoint. Reads are hooks (abortable, keep the
 * last data while refetching so tables don't flash); writes are plain functions.
 * ------------------------------------------------------------------------- */

export type LoadStatus = 'loading' | 'ready' | 'error'

/** Every status, in lifecycle order (used for filter chips and the dashboard breakdown). */
export const ORDER_STATUS_ORDER: AdminOrderStatus[] = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'return_requested', 'returned', 'payment_failed', 'cancelled']

export const ADMIN_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending_payment: 'Payment pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  return_requested: 'Return requested',
  returned: 'Returned',
  payment_failed: 'Payment failed',
  cancelled: 'Cancelled',
}

export const RETURN_REASON_LABELS: Record<string, string> = {
  damaged: 'Arrived damaged',
  wrong_item: 'Wrong item sent',
  not_as_described: 'Not as described',
  changed_mind: 'Changed their mind',
  other: 'Other',
}

/** The one forward step an admin can take from each status. */
export const NEXT_STEP: Partial<Record<AdminOrderStatus, { to: AdminOrderStatus; label: string; done: string }>> = {
  paid: { to: 'processing', label: 'Mark processing', done: 'marked processing' },
  processing: { to: 'shipped', label: 'Mark shipped', done: 'marked shipped' },
  shipped: { to: 'delivered', label: 'Mark delivered', done: 'marked delivered' },
}
export const ADMIN_CANCELLABLE: AdminOrderStatus[] = ['pending_payment', 'paid', 'processing']

export function isCod(order: Pick<AdminOrder, 'paymentMethod' | 'payment'>) {
  return order.paymentMethod === 'cod' || order.payment?.provider === 'cod' || order.payment?.method === 'cod'
}
/** Money has actually been taken online (so cancelling/returning triggers a Razorpay refund). */
export function paidOnline(order: Pick<AdminOrder, 'paymentMethod' | 'payment'>) {
  return !isCod(order) && !!order.payment?.paidAt
}

export const LOW_STOCK = 5

/** Builds `?a=1&b=x`, skipping empty values. `true` becomes `1`. */
export function toQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue
    sp.set(k, v === true ? '1' : String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function useAdminResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
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

/* ---------- Dashboard ---------- */

export function useAdminStats() {
  return useAdminResource<AdminStats>('/admin/stats')
}

/* ---------- Orders ---------- */

export interface AdminOrdersQuery { status?: AdminOrderStatus | ''; paymentMethod?: PaymentMethod | ''; q?: string; page?: number; limit?: number }

export function useAdminOrders({ status, paymentMethod, q, page = 1, limit = 20 }: AdminOrdersQuery) {
  return useAdminResource<Paginated<AdminOrder>>(`/admin/orders${toQuery({ status, paymentMethod, q, page, limit })}`)
}

export function useAdminOrder(id: string | undefined) {
  const r = useAdminResource<{ order: AdminOrder }>(id ? `/admin/orders/${id}` : null)
  const { setData } = r
  const setOrder = useCallback((order: AdminOrder) => setData({ order }), [setData])
  return { order: r.data?.order ?? null, status: r.status, error: r.error, refetch: r.refetch, setOrder }
}

export async function setOrderStatus(id: string, status: AdminOrderStatus, note?: string) {
  const body = note?.trim() ? { status, note: note.trim() } : { status }
  const { order } = await api.patch<{ order: AdminOrder }>(`/admin/orders/${id}/status`, body)
  return order
}

/* ---------- Products ---------- */

export interface AdminProductsQuery { q?: string; category?: Category | ''; page?: number; limit?: number }

export function useAdminProducts({ q, category, page = 1, limit = 20 }: AdminProductsQuery) {
  return useAdminResource<Paginated<Product>>(`/admin/products${toQuery({ q, category, page, limit, includeInactive: true })}`)
}

export async function updateProduct(id: string, patch: AdminProductPatch) {
  const { product } = await api.patch<{ product: Product }>(`/admin/products/${id}`, patch)
  return product
}

/* ---------- Customers ---------- */

export function useAdminCustomers({ q, page = 1, limit = 20 }: { q?: string; page?: number; limit?: number }) {
  return useAdminResource<Paginated<AdminCustomer>>(`/admin/customers${toQuery({ q, page, limit })}`)
}

/* ---------- Coupons ---------- */

export function useAdminCoupons() {
  return useAdminResource<{ items: Coupon[] }>('/admin/coupons')
}

export async function updateCoupon(id: string, patch: { isActive: boolean }) {
  const { coupon } = await api.patch<{ coupon: Coupon }>(`/admin/coupons/${id}`, patch)
  return coupon
}

/* ---------- Reviews ---------- */

export function useAdminReviews({ page = 1, limit = 20 }: { page?: number; limit?: number }) {
  return useAdminResource<Paginated<AdminReview>>(`/admin/reviews${toQuery({ page, limit })}`)
}

export async function deleteReview(id: string) {
  await api.del<unknown>(`/admin/reviews/${id}`)
}

/* ---------- Subscribers & messages ---------- */

/** These two lists may or may not be paginated server-side; both shapes are accepted. */
export type MaybePaginated<T> = { items: T[]; total?: number; page?: number; pages?: number }

export function useAdminSubscribers({ page = 1, limit = 50 }: { page?: number; limit?: number }) {
  return useAdminResource<MaybePaginated<AdminSubscriber>>(`/admin/subscribers${toQuery({ page, limit })}`)
}

export function useAdminMessages({ page = 1, limit = 20 }: { page?: number; limit?: number }) {
  return useAdminResource<MaybePaginated<AdminMessage>>(`/admin/messages${toQuery({ page, limit })}`)
}

/** Total units across an order's lines (tolerates lite payloads without items). */
export function unitCount(order: Pick<AdminOrder, 'items'>) {
  return (order.items ?? []).reduce((s, i) => s + i.qty, 0)
}
