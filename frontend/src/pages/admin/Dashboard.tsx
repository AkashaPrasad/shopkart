import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Boxes, Banknote, IndianRupee, Package, PackageCheck, Undo2, Users } from 'lucide-react'
import { useAdminStats, LOW_STOCK } from '@/hooks/useAdmin'
import { formatDateTime, money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Seo } from '@/components/shared/Seo'
import { ErrorState } from '@/components/shared/ErrorState'
import { AdminPageHeader, Panel } from '@/components/admin/AdminPageHeader'
import { StatTile } from '@/components/admin/StatTile'
import { SalesChart } from '@/components/admin/SalesChart'
import { StatusLinks } from '@/components/admin/StatusFilter'
import { AdminStatusChip, PaymentTag } from '@/components/admin/OrderStatus'
import { AdminThumb, CustomerCell, StockPill } from '@/components/admin/Bits'
import { isCod } from '@/hooks/useAdmin'

const n = (v: number) => v.toLocaleString('en-IN')

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const viewAll = 'inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink'

export default function Dashboard() {
  const { data, status, error, refetch } = useAdminStats()
  const navigate = useNavigate()
  const loading = !data

  if (status === 'error' && !data) {
    return (
      <div>
        <Seo title="Admin dashboard" />
        <AdminPageHeader title="Dashboard" />
        <ErrorState message={error ?? 'Couldn’t load the dashboard.'} onRetry={refetch} />
      </div>
    )
  }

  const by = data?.ordersByStatus ?? {}
  const toFulfil = (by.paid ?? 0) + (by.processing ?? 0)
  const last14 = data?.salesByDay.reduce((s, d) => s + d.total, 0) ?? 0
  const extra = data ? [data.returnsPending !== undefined, data.codOrders !== undefined].filter(Boolean).length : 0

  return (
    <div>
      <Seo title="Admin dashboard" />
      <AdminPageHeader
        title={<>{greeting()}<span className="text-accent">.</span></>}
        sub="Here’s how ShopKart is doing — tiny things, adding up."
        actions={status === 'loading' && data ? <span className="text-[13px] text-muted">Refreshing…</span> : null}
      />

      <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', extra ? 'lg:grid-cols-3 2xl:grid-cols-6' : 'xl:grid-cols-4')}>
        <StatTile label="Revenue" icon={IndianRupee} loading={loading} value={data ? money(data.revenue) : null} sub={data ? `${money(last14)} in the last 14 days` : null} />
        <StatTile label="Orders" icon={Package} to="/admin/orders" loading={loading} value={data ? n(data.ordersCount) : null} sub={data ? (toFulfil ? `${n(toFulfil)} to fulfil` : 'All caught up') : null} />
        <StatTile label="Customers" icon={Users} to="/admin/customers" loading={loading} value={data ? n(data.customersCount) : null} sub="Registered shoppers" />
        <StatTile label="Products" icon={Boxes} to="/admin/products" loading={loading} value={data ? n(data.productsCount) : null} sub={data ? (data.lowStock.length ? `${data.lowStock.length} running low` : 'Stock looks healthy') : null} />
        {data?.returnsPending !== undefined ? (
          <StatTile label="Returns pending" icon={Undo2} to="/admin/returns" value={n(data.returnsPending)} sub={data.returnsPending ? 'Waiting on a decision' : 'Nothing to review'} />
        ) : null}
        {data?.codOrders !== undefined ? (
          <StatTile label="Cash on delivery" icon={Banknote} to="/admin/orders?paymentMethod=cod" value={n(data.codOrders)} sub="COD orders placed" />
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <SalesChart data={data?.salesByDay ?? null} loading={loading} />
          </Panel>

          <Panel title="Recent orders" action={<Link to="/admin/orders" className={viewAll}>All orders<ArrowRight className="size-3.5" /></Link>} bodyClassName="pb-2 sm:pb-2">
            {loading ? (
              <ul aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="flex items-center gap-4 border-t border-line py-3.5 first:border-t-0">
                    <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-surface-2/70" />
                    <div className="h-5 w-20 animate-pulse rounded-full bg-surface-2" />
                  </li>
                ))}
              </ul>
            ) : data.recentOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No orders yet. The first one is always the sweetest.</p>
            ) : (
              <ul>
                {data.recentOrders.map((o) => (
                  <li key={o._id} className="border-t border-line first:border-t-0">
                    <Link
                      to={`/admin/orders/${o._id}`}
                      className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-xl px-2 py-3 transition-colors hover:bg-surface-2/55 sm:grid-cols-[120px_minmax(0,1fr)_auto_auto]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink tabular">{o.orderNumber}</span>
                        {isCod(o) ? <PaymentTag cod className="sm:hidden" /> : null}
                      </span>
                      <CustomerCell user={o.user} className="order-3 col-span-2 sm:order-none sm:col-span-1" />
                      <span className="text-right">
                        <span className="block text-[14px] font-semibold text-ink tabular">{money(o.total)}</span>
                        <span className="block text-[12px] text-muted tabular">{formatDateTime(o.createdAt)}</span>
                      </span>
                      <span className="hidden justify-end sm:flex"><AdminStatusChip status={o.status} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Orders by status" action={data ? <span className="text-[13px] text-muted tabular">{plural(data.ordersCount, 'order')}</span> : null}>
            {loading ? (
              <div className="flex flex-wrap gap-1.5" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} className="h-9 w-28 animate-pulse rounded-full bg-surface-2" />)}</div>
            ) : (
              <StatusLinks counts={by} />
            )}
          </Panel>

          <Panel
            title="Low stock"
            action={<Link to="/admin/products" className={viewAll}>Products<ArrowRight className="size-3.5" /></Link>}
            bodyClassName="pb-3 sm:pb-3"
          >
            {loading ? (
              <ul aria-hidden="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5"><span className="size-10 animate-pulse rounded-[10px] bg-surface-2" /><span className="h-4 flex-1 animate-pulse rounded bg-surface-2/70" /></li>
                ))}
              </ul>
            ) : data.lowStock.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-success/10 text-success" aria-hidden="true"><PackageCheck className="size-5" /></span>
                <p className="mt-3 text-sm font-medium text-ink">Shelves are stocked</p>
                <p className="mt-1 text-[13px] text-muted">Nothing is at {LOW_STOCK} or fewer.</p>
              </div>
            ) : (
              <ul className="-mx-2 max-h-[420px] overflow-y-auto">
                {data.lowStock.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/products?q=${encodeURIComponent(p.name)}`)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2/55"
                    >
                      <AdminThumb src={p.image ?? undefined} alt="" size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-[12px] text-muted">{p.slug}</span>
                      </span>
                      <StockPill stock={p.stock} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
