import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** One headline number: label, value, a short subline. Optionally links somewhere. */
export function StatTile({ label, value, sub, icon: Icon, to, loading }: { label: string; value: ReactNode; sub?: ReactNode; icon: LucideIcon; to?: string; loading?: boolean }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-ink transition-colors group-hover:bg-accent group-hover:text-accent-ink" aria-hidden="true">
          {to ? <ArrowUpRight className="hidden size-4 group-hover:block" /> : null}
          <Icon className={cn('size-4', to && 'group-hover:hidden')} />
        </span>
      </div>
      {loading ? (
        <div aria-hidden="true">
          <div className="mt-4 h-9 w-28 animate-pulse rounded-lg bg-surface-2" />
          <div className="mt-2.5 h-3.5 w-36 animate-pulse rounded bg-surface-2/70" />
        </div>
      ) : (
        <>
          <p className="mt-3 font-display text-[2rem] leading-none font-medium tracking-[-0.02em] sm:text-[2.35rem]">{value}</p>
          {sub ? <p className="mt-2 truncate text-[13px] text-muted">{sub}</p> : null}
        </>
      )}
    </>
  )
  const cls = 'group block min-w-0 rounded-[20px] border border-line bg-surface p-4 sm:p-5'
  return to ? (
    <Link to={to} aria-label={`${label}: open`} className={cn(cls, 'transition-[border-color,box-shadow] duration-200 hover:border-ink/25 hover:shadow-[var(--shadow-soft)]')} aria-busy={loading || undefined}>{body}</Link>
  ) : (
    <div className={cls} aria-busy={loading || undefined}>{body}</div>
  )
}
