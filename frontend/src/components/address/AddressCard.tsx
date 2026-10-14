import type { ReactNode } from 'react'
import { Briefcase, Home, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Address, AddressType } from '@/types'

type AddressLike = Pick<Address, 'fullName' | 'phone' | 'pincode' | 'line1' | 'city' | 'state'> & {
  line2?: string | null
  landmark?: string | null
  type?: AddressType | string | null
  isDefault?: boolean
}

const TYPE_META: Record<string, { label: string; icon: typeof Home }> = {
  home: { label: 'Home', icon: Home },
  work: { label: 'Work', icon: Briefcase },
  other: { label: 'Other', icon: MapPin },
}

export function formatPhone(p?: string | null) {
  if (!p) return ''
  const d = p.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p
}

/** Address text block (no chrome) — used in cards, review, order detail. */
export function AddressLines({ address, className }: { address: AddressLike; className?: string }) {
  return (
    <address className={cn('text-sm leading-relaxed text-muted not-italic', className)}>
      <span className="block font-medium text-ink">{address.fullName}</span>
      <span className="block">{[address.line1, address.line2].filter(Boolean).join(', ')}</span>
      {address.landmark ? <span className="block">Near {address.landmark}</span> : null}
      <span className="block">{address.city}, {address.state} <span className="tabular">{address.pincode}</span></span>
      <span className="mt-1 block tabular">{formatPhone(address.phone)}</span>
    </address>
  )
}

export function AddressTypeTag({ type, isDefault }: { type?: string | null; isDefault?: boolean }) {
  const meta = TYPE_META[type ?? 'home'] ?? TYPE_META.other
  const Icon = meta.icon
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
        <Icon className="size-3.5" aria-hidden="true" />{meta.label}
      </span>
      {isDefault ? <span className="rounded-full border border-ink/15 bg-surface-2 px-2 py-px text-[11px] font-medium text-ink">Default</span> : null}
    </span>
  )
}

/** Static address card with an optional actions row. */
export function AddressCard({ address, actions, className, children }: { address: AddressLike; actions?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('flex h-full flex-col rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5', className)}>
      <AddressTypeTag type={address.type} isDefault={address.isDefault} />
      <AddressLines address={address} className="mt-3" />
      {children}
      {actions ? <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">{actions}</div> : null}
    </div>
  )
}

export const cardActionClass = 'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5'
