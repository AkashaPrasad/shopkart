import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, MapPin, Package } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useAddresses } from '@/hooks/useAddresses'
import { useOrders, isCod, PAID_STATUSES } from '@/hooks/useOrders'
import { money } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { firstName, pill } from '@/components/auth/form'
import { AddressCard } from '@/components/address/AddressCard'
import { OrderRow, OrderRowSkeleton } from '@/components/account/OrderRow'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Stat({ label, value, loading, foot }: { label: string; value: string; loading?: boolean; foot?: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius)] border border-line bg-surface p-3.5 sm:p-5">
      <p className="truncate text-[11px] font-semibold tracking-[0.12em] text-muted uppercase sm:text-[12px]">{label}</p>
      {loading ? <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-surface-2" /> : <p className="mt-2 truncate font-display text-[1.6rem] leading-none font-medium tabular sm:text-[2.4rem]">{value}</p>}
      {foot ? <p className="mt-2 hidden text-[12px] text-muted sm:block">{foot}</p> : null}
    </div>
  )
}

export default function Overview() {
  const user = useAuth((s) => s.user)
  const book = useAddresses()
  // One page of up to 50 is plenty for lifetime stats on a store where an order is ~₹100.
  const { data, status, error, refetch } = useOrders(1, 50)
  const orders = data?.items ?? []
  // Money actually paid: online orders past payment, and COD orders only once collected.
  const spent = orders.filter((o) => (isCod(o) ? !!o.payment.paidAt : PAID_STATUSES.includes(o.status) || o.status === 'return_requested')).reduce((s, o) => s + o.total, 0)
  const awaiting = orders.find((o) => o.status === 'pending_payment' || o.status === 'payment_failed')
  const defaultAddress = book.items.find((a) => a.isDefault) ?? null
  const loadingOrders = status === 'loading' && !data

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-[2.1rem] leading-[1.05] font-medium sm:text-[2.8rem]">
          {greeting()}, <em className="font-normal text-accent">{firstName(user?.name)}</em>.
        </h1>
        <p className="mt-2 text-[15px] text-muted">Orders, addresses and details — all in one tidy drawer.</p>
      </div>

      {awaiting ? (
        <Link to={`/account/orders/${awaiting._id}`} className="group flex items-center gap-3 rounded-[var(--radius)] border border-warning/30 bg-warning/[0.07] px-4 py-3.5 text-sm transition-colors hover:border-warning/50">
          <Clock3 className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="min-w-0 flex-1">Order <span className="font-semibold tabular">{awaiting.orderNumber}</span> is waiting for payment of <span className="font-semibold tabular">{money(awaiting.total)}</span>.</span>
          <span className="shrink-0 font-semibold text-ink group-hover:underline">Pay now</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Orders" value={String(data?.total ?? 0)} loading={loadingOrders} />
        <Stat label="Spent" value={money(spent)} loading={loadingOrders} foot="Paid orders only" />
        <Stat label="Addresses" value={String(book.items.length)} loading={book.status !== 'ready' && !book.items.length && book.status !== 'error'} />
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-medium">Recent orders</h2>
          {orders.length ? <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">All orders <ArrowRight className="size-3.5" /></Link> : null}
        </div>
        {status === 'error' && !data ? (
          <ErrorState message={error ?? 'Couldn’t load your orders.'} onRetry={refetch} />
        ) : loadingOrders ? (
          <ul className="flex flex-col gap-3">{[0, 1, 2].map((i) => <OrderRowSkeleton key={i} />)}</ul>
        ) : orders.length ? (
          <ul className="flex flex-col gap-3">{orders.slice(0, 3).map((o) => <OrderRow key={o._id} order={o} />)}</ul>
        ) : (
          <EmptyState icon={<Package className="size-6" />} title="No orders yet" description="Your first tiny haul is a few clicks away." action={<Link to="/shop" className={pill('ink')}>Start shopping</Link>} className="py-12" />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-medium">Default address</h2>
          <Link to="/account/addresses" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">Manage <ArrowRight className="size-3.5" /></Link>
        </div>
        {book.status === 'error' && !book.items.length ? (
          <ErrorState message={book.error ?? 'Couldn’t load your addresses.'} onRetry={() => book.load().catch(() => {})} />
        ) : book.status !== 'ready' && !book.items.length ? (
          <div className="h-[168px] max-w-md animate-pulse rounded-[var(--radius)] bg-surface-2/70" />
        ) : defaultAddress ? (
          <AddressCard address={defaultAddress} className="max-w-md" />
        ) : (
          <EmptyState icon={<MapPin className="size-6" />} title="No address saved" description="Add one now and checkout takes seconds." action={<Link to="/account/addresses" className={pill('ink')}>Add an address</Link>} className="py-12" />
        )}
      </section>
    </div>
  )
}
