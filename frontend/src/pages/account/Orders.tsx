import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { pill } from '@/components/auth/form'
import { AccountHeading } from '@/components/account/AccountHeading'
import { OrderRow, OrderRowSkeleton } from '@/components/account/OrderRow'

const LIMIT = 10

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, status, error, refetch } = useOrders(page, LIMIT)
  const go = (p: number) => {
    setParams(p === 1 ? {} : { page: String(p) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <AccountHeading title="Orders" sub={data && data.total > 0 ? `${plural(data.total, 'order')} so far. Every one of them tiny.` : 'Everything you’ve ordered, newest first.'} />

      {status === 'error' && !data ? (
        <ErrorState message={error ?? 'Couldn’t load your orders.'} onRetry={refetch} />
      ) : !data ? (
        <ul className="flex flex-col gap-3" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <OrderRowSkeleton key={i} />)}</ul>
      ) : data.items.length === 0 && page === 1 ? (
        <EmptyState icon={<Package className="size-6" />} title="No orders yet" description="When you check out, your orders show up here with live status." action={<Link to="/shop" className={pill('ink')}>Browse the shop</Link>} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Nothing on this page" description="Looks like you’ve gone past the last page." action={<button type="button" onClick={() => go(1)} className={pill('ink')}>Back to page 1</button>} />
      ) : (
        <>
          <ul className={cn('flex flex-col gap-3 transition-opacity', status === 'loading' && 'opacity-60')} aria-busy={status === 'loading'}>
            {data.items.map((o) => <OrderRow key={o._id} order={o} />)}
          </ul>
          {data.pages > 1 ? (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
              <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} className={pill('outline', 'sm')}><ChevronLeft className="size-4" />Newer</button>
              <p className="text-[13px] text-muted tabular">Page {page} of {data.pages}</p>
              <button type="button" onClick={() => go(page + 1)} disabled={page >= data.pages} className={pill('outline', 'sm')}>Older<ChevronRight className="size-4" /></button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
