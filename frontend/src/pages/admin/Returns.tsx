import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Undo2, X } from 'lucide-react'
import { RETURN_REASON_LABELS, isCod, unitCount, useAdminOrders } from '@/hooks/useAdmin'
import { formatDateTime, money, plural } from '@/lib/format'
import type { AdminOrder } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormBanner, PillButton, pill } from '@/components/auth/form'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PaymentTag } from '@/components/admin/OrderStatus'
import { CustomerCell } from '@/components/admin/Bits'
import { Pagination } from '@/components/admin/DataTable'
import { StatusDialog, useOrderTransition } from '@/components/admin/OrderActions'

const LIMIT = 20

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

export default function Returns() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, setData, status, error, refetch } = useAdminOrders({ status: 'return_requested', page, limit: LIMIT })
  const [dialog, setDialog] = useState<{ order: AdminOrder; kind: 'approve' | 'reject' } | null>(null)

  // A resolved return leaves the queue.
  const onUpdated = useCallback((o: AdminOrder) => {
    setData((d) => (d ? { ...d, items: d.items.filter((x) => x._id !== o._id), total: Math.max(0, d.total - 1) } : d))
  }, [setData])
  const { run, pending, conflict, clearConflict } = useOrderTransition({ onUpdated, onConflict: refetch })

  const resolve = async (order: AdminOrder, kind: 'approve' | 'reject', note?: string) => {
    if (await run(order, kind === 'approve' ? 'returned' : 'delivered', note)) setDialog(null)
  }
  const goPage = (p: number) => { setParams(p > 1 ? { page: String(p) } : {}); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const current = dialog?.order

  return (
    <div>
      <Seo title="Returns · Admin" />
      <AdminPageHeader title="Returns" sub={data ? (data.total ? `${plural(data.total, 'return')} waiting on a decision.` : 'Nothing waiting. Lovely.') : 'Return requests waiting on a decision.'} />

      <FormBanner show={!!conflict} tone="warning" title="That return was already handled" className="mb-4" action={<button type="button" onClick={clearConflict} className="text-[13px] font-medium text-ink underline underline-offset-2">Dismiss</button>}>
        {conflict} The queue has been refreshed.
      </FormBanner>

      {status === 'error' && !data ? (
        <ErrorState message={error ?? 'Couldn’t load returns.'} onRetry={refetch} />
      ) : !data ? (
        <ul className="grid gap-3 lg:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => <li key={i} className="h-56 animate-pulse rounded-[20px] border border-line bg-surface" />)}
        </ul>
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Undo2 className="size-6" />} title="No returns to review" description="When a customer asks to send something back, it lands here for you to approve or reject." action={<Link to="/admin/orders" className={pill('outline')}>See all orders</Link>} />
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2" aria-busy={status === 'loading'}>
            {data.items.map((o) => {
              const ret = o.return
              const cod = isCod(o)
              const mine = pending?.id === o._id
              return (
                <li key={o._id} className="flex flex-col rounded-[20px] border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/admin/orders/${o._id}`} state={{ back: '/admin/returns' }} className="inline-flex items-center gap-1 text-[16px] font-semibold text-ink tabular hover:underline">
                        {o.orderNumber}<ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                      <p className="mt-0.5 text-[13px] text-muted tabular">{money(o.total)} · {plural(unitCount(o), 'item')}</p>
                    </div>
                    <PaymentTag cod={cod} />
                  </div>
                  <CustomerCell user={o.user} className="mt-3" />
                  <div className="mt-4 rounded-xl bg-surface-2/60 p-3.5">
                    <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">{ret ? RETURN_REASON_LABELS[ret.reason] ?? ret.reason : 'No reason given'}</span>
                      {ret?.requestedAt ? <time dateTime={ret.requestedAt} title={formatDateTime(ret.requestedAt)} className="text-[12px] text-muted">Requested {daysAgo(ret.requestedAt)}</time> : null}
                    </p>
                    {ret?.note ? <p className="mt-1.5 text-[13.5px] leading-snug text-muted text-pretty">“{ret.note}”</p> : null}
                  </div>
                  <p className="mt-3 text-[12.5px] text-muted">{cod ? `Paid in cash — approving means refunding ${money(o.total)} manually.` : `Approving refunds ${money(o.total)} via Razorpay.`}</p>
                  <div className="mt-auto flex gap-2 pt-4">
                    <PillButton variant="accent" size="sm" onClick={() => setDialog({ order: o, kind: 'approve' })} disabled={!!pending} loading={mine && pending?.to === 'returned'} loadingText="Approving…">
                      <Check className="size-3.5" />Approve
                    </PillButton>
                    <button type="button" onClick={() => setDialog({ order: o, kind: 'reject' })} disabled={!!pending} className={pill('outline', 'sm')}>
                      <X className="size-3.5" />Reject
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} noun={['return', 'returns']} onPage={goPage} />
        </>
      )}

      <StatusDialog
        open={dialog?.kind === 'approve'}
        onOpenChange={(o) => { if (!o) setDialog(null) }}
        title={current ? `Approve return for ${current.orderNumber}?` : 'Approve return?'}
        description={current ? (isCod(current)
          ? <>It becomes <b className="font-medium text-ink">Returned</b>. It was paid in cash, so refund <span className="font-medium text-ink tabular">{money(current.total)}</span> manually.</>
          : <>It becomes <b className="font-medium text-ink">Returned</b> and <span className="font-medium text-ink tabular">{money(current.total)}</span> is refunded via Razorpay.</>) : null}
        notePlaceholder="e.g. Pickup arranged for Friday"
        confirmLabel="Approve return"
        busyLabel="Approving…"
        tone="accent"
        busy={pending?.to === 'returned'}
        onConfirm={(note) => { if (current) void resolve(current, 'approve', note) }}
      />
      <StatusDialog
        open={dialog?.kind === 'reject'}
        onOpenChange={(o) => { if (!o) setDialog(null) }}
        title="Reject this return?"
        description="The order goes back to Delivered and nothing is refunded. Tell the customer why — they’ll see this note on their order."
        noteLabel="Reason for the customer"
        noteRequired
        notePlaceholder="e.g. Item shows signs of use"
        confirmLabel="Reject return"
        busyLabel="Rejecting…"
        busy={pending?.to === 'delivered'}
        onConfirm={(note) => { if (current) void resolve(current, 'reject', note) }}
      />
    </div>
  )
}
