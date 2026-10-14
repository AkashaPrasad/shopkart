import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { LOW_STOCK } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'
import type { AdminUserRef, Badge, User } from '@/types'

export function CustomerCell({ user, className }: { user: AdminUserRef | null | undefined; className?: string }) {
  if (!user || !user.email) return <span className={cn('text-[13px] text-muted', className)}>Deleted account</span>
  return (
    <span className={cn('block min-w-0', className)}>
      <span className="block truncate text-[14px] font-medium text-ink">{user.name || 'Unnamed'}</span>
      <span className="block truncate text-[12.5px] text-muted">{user.email}</span>
    </span>
  )
}

export function RoleBadge({ role }: { role: User['role'] }) {
  return role === 'admin' ? (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-ink px-2.5 text-[11.5px] font-semibold text-bg">
      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />Admin
    </span>
  ) : (
    <span className="inline-flex h-6 items-center rounded-full border border-line px-2.5 text-[11.5px] font-medium text-muted">Shopper</span>
  )
}

const BADGE_TONE: Record<Badge, string> = {
  new: 'bg-accent-2/10 text-accent-2',
  bestseller: 'bg-accent/12 text-accent',
  limited: 'bg-ink/[0.07] text-ink',
}
const BADGE_LABEL: Record<Badge, string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' }

export function ProductBadges({ badges }: { badges: Badge[] }) {
  if (!badges?.length) return <span className="text-[13px] text-muted/60" aria-label="No badges">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b} className={cn('inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-semibold', BADGE_TONE[b] ?? 'bg-surface-2 text-ink')}>{BADGE_LABEL[b] ?? b}</span>
      ))}
    </span>
  )
}

/** "3 left" / "Sold out" pill for low stock lists. */
export function StockPill({ stock }: { stock: number }) {
  const out = stock <= 0
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold tabular whitespace-nowrap', out ? 'bg-danger/10 text-danger' : stock <= LOW_STOCK ? 'bg-warning/12 text-warning' : 'bg-surface-2 text-ink')}>
      {out ? 'Sold out' : `${stock} left`}
    </span>
  )
}

export function CopyValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-md font-mono text-[12px] text-ink hover:text-accent"
      aria-label={`Copy ${label ?? value}`}
    >
      <span className="truncate">{value}</span>
      {copied ? <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" /> : <Copy className="size-3.5 shrink-0 text-muted group-hover:text-accent" aria-hidden="true" />}
    </button>
  )
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  )
}

/** Small square product image with a calm placeholder. */
export function AdminThumb({ src, alt, size = 'md' }: { src?: string; alt: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('block shrink-0 overflow-hidden rounded-[10px] border border-line bg-surface-2', size === 'sm' ? 'size-10' : 'size-12')}>
      {src ? <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full object-cover" /> : null}
    </span>
  )
}
