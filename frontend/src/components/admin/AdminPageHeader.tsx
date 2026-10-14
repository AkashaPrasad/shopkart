import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Quiet "Admin" marker so it's always obvious you're in the back office. */
export function AdminBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase', className)}>
      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
      Admin
    </span>
  )
}

export function AdminPageHeader({ title, sub, actions, eyebrow }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AdminBadge />
          {eyebrow}
        </div>
        <h1 className="font-display text-[2rem] leading-[1.05] font-medium sm:text-[2.6rem]">{title}</h1>
        {sub ? <p className="mt-2 text-[15px] text-muted text-pretty">{sub}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** Card section with the small uppercase label used across account + admin. */
export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('rounded-[20px] border border-line bg-surface', className)}>
      {title || action ? (
        <div className="flex min-h-14 items-center justify-between gap-3 px-5 pt-4 sm:px-6">
          {title ? <h2 className="font-sans text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={cn('px-5 pb-5 sm:px-6 sm:pb-6', !title && !action && 'pt-5 sm:pt-6', bodyClassName)}>{children}</div>
    </section>
  )
}
