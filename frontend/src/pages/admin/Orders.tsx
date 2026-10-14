import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Package, SearchX } from 'lucide-react'
import { ADMIN_STATUS_LABELS, ORDER_STATUS_ORDER, isCod, unitCount, useAdminOrders, useAdminStats } from '@/hooks/useAdmin'
import { formatDate, formatDateTime, money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminOrderStatus, PaymentMethod } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { pill } from '@/components/auth/form'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminSearch } from '@/components/admin/AdminSearch'
import { StatusFilter } from '@/components/admin/StatusFilter'
import { AdminStatusChip, PaymentTag } from '@/components/admin/OrderStatus'
import { CustomerCell } from '@/components/admin/Bits'
import { CardList, CardSkeletons, Pagination, SkeletonRows, TableCard, THead, Td, Th, Tr, cardItemClass } from '@/components/admin/DataTable'

const LIMIT = 20
const METHODS: { key: PaymentMethod | ''; label: string }[] = [
  { key: '', label: 'Any payment' },
  { key: 'razorpay', label: 'Online' },
  { key: 'cod', label: 'Cash on delivery' },
]

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const rawStatus = params.get('status') ?? ''
  const status = (ORDER_STATUS_ORDER as string[]).includes(rawStatus) ? (rawStatus as AdminOrderStatus) : ''
  const rawMethod = params.get('paymentMethod') ?? ''
  const paymentMethod: PaymentMethod | '' = rawMethod === 'cod' || rawMethod === 'razorpay' ? rawMethod : ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const { data, status: load, error, refetch } = useAdminOrders({ status, paymentMethod, q, page, limit: LIMIT })
  const stats = useAdminStats()

  const update = (patch: Record<string, string>, keepPage = false) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
      if (!keepPage) next.delete('page')
      return next
    }, { replace: 'q' in patch })
  }
  const goPage = (p: number) => { update({ page: p > 1 ? String(p) : '' }, true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const open = (id: string) => navigate(`/admin/orders/${id}`, { state: { back: `/admin/orders${search}` } })
  const filtered = !!(status || q || paymentMethod)
  const busy = load === 'loading' && !!data

  return (
    <div>
      <Seo title="Orders · Admin" />
      <AdminPageHeader
        title="Orders"
        sub={data ? `${plural(data.total, 'order')}${filtered ? ' match these filters' : ', newest first'}.` : 'Every order, newest first.'}
      />

      <div className="flex flex-col gap-3">
        <StatusFilter value={status} counts={stats.data?.ordersByStatus} total={stats.data?.ordersCount} onChange={(s) => update({ status: s })} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AdminSearch value={q} onChange={(v) => update({ q: v })} label="Search orders" placeholder="Order number, email or name" className="sm:max-w-sm sm:flex-1" />
          <div role="group" aria-label="Payment method" className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
            {METHODS.map((m) => (
              <button
                key={m.key || 'any'}
                type="button"
                aria-pressed={paymentMethod === m.key}
                onClick={() => update({ paymentMethod: m.key })}
                className={cn('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors', paymentMethod === m.key ? 'bg-ink text-bg' : 'text-muted hover:text-ink')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {load === 'error' && !data ? (
          <ErrorState message={error ?? 'Couldn’t load orders.'} onRetry={refetch} />
        ) : data && data.items.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title="No orders match"
              description={q ? `Nothing for “${q}”${status ? ` in ${ADMIN_STATUS_LABELS[status].toLowerCase()}` : ''}. Try an order number like SK-AB12CD, or an email.` : 'Nothing with these filters right now.'}
              action={<button type="button" onClick={() => setParams({})} className={pill('outline')}>Clear filters</button>}
            />
          ) : page > 1 ? (
            <EmptyState title="Nothing on this page" description="You’ve gone past the last page." action={<button type="button" onClick={() => goPage(1)} className={pill('ink')}>Back to page 1</button>} />
          ) : (
            <EmptyState icon={<Package className="size-6" />} title="No orders yet" description="When someone checks out, their order lands here." />
          )
        ) : (
          <>
            <TableCard label="Orders" busy={busy}>
              <THead>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Placed</Th>
                <Th align="right">Items</Th>
                <Th align="right">Total</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
              </THead>
              <tbody>
                {!data ? <SkeletonRows cols={7} /> : data.items.map((o) => (
                  <Tr key={o._id} onActivate={() => open(o._id)}>
                    <Td>
                      <Link to={`/admin/orders/${o._id}`} state={{ back: `/admin/orders${search}` }} className="font-semibold text-ink tabular hover:underline">{o.orderNumber}</Link>
                    </Td>
                    <Td className="max-w-[260px]"><CustomerCell user={o.user} /></Td>
                    <Td className="whitespace-nowrap text-muted tabular"><time dateTime={o.createdAt} title={formatDateTime(o.createdAt)}>{formatDate(o.createdAt)}</time></Td>
                    <Td align="right" className="text-muted tabular">{unitCount(o)}</Td>
                    <Td align="right" className="font-semibold text-ink tabular">{money(o.total)}</Td>
                    <Td><PaymentTag cod={isCod(o)} /></Td>
                    <Td><AdminStatusChip status={o.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>

            {!data ? <CardSkeletons /> : (
              <CardList label="Orders" busy={busy}>
                {data.items.map((o) => (
                  <li key={o._id}>
                    <Link to={`/admin/orders/${o._id}`} state={{ back: `/admin/orders${search}` }} className={cardItemClass}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-ink tabular">{o.orderNumber}</p>
                          <p className="mt-0.5 text-[12.5px] text-muted tabular">{formatDateTime(o.createdAt)} · {plural(unitCount(o), 'item')}</p>
                        </div>
                        <p className="text-[15px] font-semibold text-ink tabular">{money(o.total)}</p>
                      </div>
                      <CustomerCell user={o.user} className="mt-3" />
                      <div className="mt-3 flex items-center gap-2">
                        <AdminStatusChip status={o.status} />
                        {isCod(o) ? <PaymentTag cod /> : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </CardList>
            )}

            {data ? <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} noun={['order', 'orders']} onPage={goPage} /> : null}
          </>
        )}
      </div>
    </div>
  )
}
