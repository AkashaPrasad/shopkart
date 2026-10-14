import type { ComponentProps, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pill } from '@/components/auth/form'
import { cn } from '@/lib/utils'

/* ----------------------------------------------------------------------------
 * Table primitives. Tables render from md (768px) up; below that each page
 * renders the same rows as a card list (`CardList` / `CardItem`).
 * ------------------------------------------------------------------------- */

export function TableCard({ children, className, busy, label }: { children: ReactNode; className?: string; busy?: boolean; label: string }) {
  return (
    <div className={cn('hidden overflow-hidden rounded-[20px] border border-line bg-surface md:block', className)}>
      <div className="overflow-x-auto">
        <table aria-label={label} aria-busy={busy || undefined} className={cn('w-full border-collapse text-left text-sm transition-opacity', busy && 'opacity-60')}>
          {children}
        </table>
      </div>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-2/45">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, align = 'left', className, ...rest }: ComponentProps<'th'> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      {...rest}
      className={cn(
        'h-11 px-4 text-[11px] font-semibold tracking-[0.12em] whitespace-nowrap text-muted uppercase first:pl-5 last:pr-5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, align = 'left', className, ...rest }: ComponentProps<'td'> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td {...rest} className={cn('px-4 py-3.5 align-middle first:pl-5 last:pr-5', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>
      {children}
    </td>
  )
}

/**
 * Body row. With `onActivate`, the whole row is clickable (a real link inside the row
 * still carries keyboard focus); clicks on inner buttons/inputs/links are ignored.
 */
export function Tr({ children, onActivate, className }: { children: ReactNode; onActivate?: () => void; className?: string }) {
  const onClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!onActivate) return
    const target = e.target as HTMLElement
    if (target.closest('a,button,input,label,[role=switch],textarea,select')) return
    if (window.getSelection()?.toString()) return
    onActivate()
  }
  return (
    <tr
      onClick={onActivate ? onClick : undefined}
      className={cn('border-t border-line first:border-t-0 transition-colors', onActivate && 'cursor-pointer hover:bg-surface-2/55', className)}
    >
      {children}
    </tr>
  )
}

export function SkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-t border-line first:border-t-0" aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-4 first:pl-5 last:pr-5">
              <div className={cn('h-4 animate-pulse rounded bg-surface-2', c === 0 ? 'w-32' : c % 2 ? 'w-20' : 'w-14')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ---------- mobile card list ---------- */

export function CardList({ children, busy, label }: { children: ReactNode; busy?: boolean; label: string }) {
  return (
    <ul aria-label={label} aria-busy={busy || undefined} className={cn('flex flex-col gap-2.5 transition-opacity md:hidden', busy && 'opacity-60')}>
      {children}
    </ul>
  )
}

export function CardSkeletons({ count = 5 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-2.5 md:hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
          <div className="mt-2.5 h-3 w-44 animate-pulse rounded bg-surface-2/70" />
          <div className="mt-4 flex justify-between"><div className="h-5 w-20 animate-pulse rounded-full bg-surface-2" /><div className="h-4 w-12 animate-pulse rounded bg-surface-2" /></div>
        </li>
      ))}
    </ul>
  )
}

export const cardItemClass =
  'block rounded-[var(--radius)] border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-ink/25 hover:shadow-[var(--shadow-soft)]'

/* ---------- pagination ---------- */

export function Pagination({ page, pages, total, limit, noun, onPage }: { page: number; pages: number; total: number; limit: number; noun: [string, string]; onPage: (p: number) => void }) {
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-muted tabular">
        {from}–{to} of {total.toLocaleString('en-IN')} {total === 1 ? noun[0] : noun[1]}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={pill('outline', 'sm')} aria-label="Previous page">
            <ChevronLeft className="size-4" />Prev
          </button>
          <span className="min-w-16 text-center text-[13px] text-muted tabular">{page} / {pages}</span>
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} className={pill('outline', 'sm')} aria-label="Next page">
            Next<ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </nav>
  )
}

/** Lets a non-link element act on Enter/Space like a button. */
export function onEnterOrSpace(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() }
  }
}
