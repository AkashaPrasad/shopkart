import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-line px-6 py-16 text-center', className)}>
      {icon ? <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">{icon}</div> : null}
      <h3 className="font-display text-2xl">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-muted text-pretty">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
