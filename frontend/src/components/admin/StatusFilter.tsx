import { Link } from 'react-router-dom'
import { ADMIN_STATUS_LABELS as LABELS, ORDER_STATUS_ORDER } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'
import type { AdminOrderStatus } from '@/types'

export const STATUS_DOT: Record<AdminOrderStatus, string> = {
  pending_payment: 'bg-warning',
  paid: 'bg-success',
  processing: 'bg-accent-2',
  shipped: 'bg-accent-2',
  delivered: 'bg-success',
  return_requested: 'bg-accent',
  returned: 'bg-muted',
  payment_failed: 'bg-danger',
  cancelled: 'bg-muted',
}

const chip = 'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors'
const chipIdle = 'border-line bg-surface text-ink hover:border-ink/30'
const chipActive = 'border-ink bg-ink text-bg'

function Count({ n, active }: { n?: number; active?: boolean }) {
  if (n === undefined) return null
  return <span className={cn('tabular text-[12px]', active ? 'text-bg/70' : 'text-muted')}>{n.toLocaleString('en-IN')}</span>
}

/** "All" + one chip per status, with counts when known. Scrolls horizontally on small screens. */
export function StatusFilter({ value, counts, total, onChange }: { value: AdminOrderStatus | ''; counts?: Partial<Record<AdminOrderStatus, number>>; total?: number; onChange: (s: AdminOrderStatus | '') => void }) {
  return (
    <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div role="group" aria-label="Filter by status" className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 xl:flex-wrap xl:overflow-visible">
        <button type="button" aria-pressed={value === ''} onClick={() => onChange('')} className={cn(chip, value === '' ? chipActive : chipIdle)}>
          All <Count n={total} active={value === ''} />
        </button>
        {ORDER_STATUS_ORDER.map((s) => {
          const active = value === s
          return (
            <button key={s} type="button" aria-pressed={active} onClick={() => onChange(active ? '' : s)} className={cn(chip, active ? chipActive : chipIdle)}>
              <span className={cn('size-1.5 rounded-full', STATUS_DOT[s])} aria-hidden="true" />
              {LABELS[s]}
              <Count n={counts ? counts[s] ?? 0 : undefined} active={active} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Dashboard variant: every status as a link into the filtered orders list. */
export function StatusLinks({ counts }: { counts: Partial<Record<AdminOrderStatus, number>> }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {ORDER_STATUS_ORDER.map((s) => {
        const n = counts[s] ?? 0
        return (
          <li key={s}>
            <Link
              to={`/admin/orders?status=${s}`}
              className={cn(chip, chipIdle, n === 0 && 'text-muted')}
              aria-label={`${LABELS[s]}: ${n} ${n === 1 ? 'order' : 'orders'}`}
            >
              <span className={cn('size-1.5 rounded-full', STATUS_DOT[s], n === 0 && 'opacity-40')} aria-hidden="true" />
              {LABELS[s]}
              <span className={cn('tabular text-[12px] font-semibold', n === 0 ? 'text-muted/70' : 'text-ink')}>{n.toLocaleString('en-IN')}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
