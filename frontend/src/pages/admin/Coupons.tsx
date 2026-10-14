import { useCallback } from 'react'
import { TicketPercent } from 'lucide-react'
import { toast } from 'sonner'
import { updateCoupon, useAdminCoupons } from '@/hooks/useAdmin'
import { errorMessage } from '@/lib/api'
import { formatDate, money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Coupon } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Switch } from '@/components/ui/switch'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { CardList, CardSkeletons, SkeletonRows, TableCard, THead, Td, Th, Tr } from '@/components/admin/DataTable'

function offer(c: Coupon) {
  if (c.type === 'percent') return `${c.value}% off`
  if (c.type === 'flat') return `${money(c.value)} off`
  return 'Free shipping'
}
const TYPE_LABEL: Record<Coupon['type'], string> = { percent: 'Percent', flat: 'Flat', freeship: 'Free shipping' }
const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()

function Code({ c }: { c: Coupon }) {
  return (
    <span className={cn('inline-flex h-7 items-center rounded-lg border border-dashed px-2.5 font-mono text-[13px] font-semibold tracking-[0.06em]', c.isActive && !isExpired(c) ? 'border-accent/50 bg-accent/[0.06] text-ink' : 'border-line text-muted')}>
      {c.code}
    </span>
  )
}

function ActiveToggle({ c, onToggle }: { c: Coupon; onToggle: (c: Coupon, v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <Switch checked={c.isActive} onCheckedChange={(v) => onToggle(c, v)} aria-label={`${c.isActive ? 'Turn off' : 'Turn on'} ${c.code}`} className="data-[state=checked]:bg-success" />
      <span className={cn('text-[12.5px] font-medium', c.isActive ? 'text-ink' : 'text-muted')}>{c.isActive ? 'On' : 'Off'}</span>
    </label>
  )
}

export default function Coupons() {
  const { data, setData, status, error, refetch } = useAdminCoupons()

  const patchLocal = useCallback((id: string, patch: Partial<Coupon>) => {
    setData((d) => (d ? { ...d, items: d.items.map((c) => (c._id === id ? { ...c, ...patch } : c)) } : d))
  }, [setData])

  const toggle = async (c: Coupon, isActive: boolean) => {
    patchLocal(c._id, { isActive })
    try {
      const saved = await updateCoupon(c._id, { isActive })
      patchLocal(c._id, saved)
      toast.success(isActive ? `${c.code} is on — shoppers can use it` : `${c.code} is off`)
    } catch (e) {
      patchLocal(c._id, { isActive: !isActive })
      toast.error(errorMessage(e, `Couldn’t update ${c.code}.`))
    }
  }

  const items = data?.items ?? []
  const live = items.filter((c) => c.isActive && !isExpired(c)).length

  return (
    <div>
      <Seo title="Coupons · Admin" />
      <AdminPageHeader title="Coupons" sub={data ? `${plural(items.length, 'coupon')} · ${live} live. Codes are case-insensitive at checkout.` : 'Discount codes shoppers can apply at checkout.'} />

      {status === 'error' && !data ? (
        <ErrorState message={error ?? 'Couldn’t load coupons.'} onRetry={refetch} />
      ) : data && items.length === 0 ? (
        <EmptyState icon={<TicketPercent className="size-6" />} title="No coupons yet" description="Seeded codes like WELCOME10 will appear here." />
      ) : (
        <>
          <TableCard label="Coupons">
            <THead>
              <Th>Code</Th>
              <Th>Type</Th>
              <Th>Offer</Th>
              <Th align="right">Min order</Th>
              <Th align="right">Max discount</Th>
              <Th>Expires</Th>
              <Th>Active</Th>
            </THead>
            <tbody>
              {!data ? <SkeletonRows cols={7} rows={3} /> : items.map((c) => (
                <Tr key={c._id}>
                  <Td><Code c={c} /></Td>
                  <Td className="text-muted">{TYPE_LABEL[c.type] ?? c.type}</Td>
                  <Td className="font-medium text-ink tabular">{offer(c)}</Td>
                  <Td align="right" className="text-muted tabular">{c.minSubtotal ? money(c.minSubtotal) : '—'}</Td>
                  <Td align="right" className="text-muted tabular">{c.maxDiscount ? money(c.maxDiscount) : '—'}</Td>
                  <Td className="whitespace-nowrap tabular">{c.expiresAt ? <span className={isExpired(c) ? 'text-danger' : 'text-muted'}>{isExpired(c) ? 'Expired ' : ''}{formatDate(c.expiresAt)}</span> : <span className="text-muted">Never</span>}</Td>
                  <Td><ActiveToggle c={c} onToggle={(cc, v) => void toggle(cc, v)} /></Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>

          {!data ? <CardSkeletons count={3} /> : (
            <CardList label="Coupons">
              {items.map((c) => (
                <li key={c._id} className="rounded-[var(--radius)] border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Code c={c} />
                    <ActiveToggle c={c} onToggle={(cc, v) => void toggle(cc, v)} />
                  </div>
                  <p className="mt-3 font-display text-xl font-medium">{offer(c)}</p>
                  <p className="mt-1 text-[13px] text-muted tabular">
                    {[c.minSubtotal ? `On orders over ${money(c.minSubtotal)}` : 'No minimum', c.maxDiscount ? `up to ${money(c.maxDiscount)}` : null, c.expiresAt ? `${isExpired(c) ? 'expired' : 'ends'} ${formatDate(c.expiresAt)}` : null].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </CardList>
          )}
        </>
      )}
    </div>
  )
}
