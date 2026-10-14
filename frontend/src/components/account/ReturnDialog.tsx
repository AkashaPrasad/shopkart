import { useId, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { toast } from 'sonner'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormBanner, PillButton, inputClass, pill } from '@/components/auth/form'
import type { OrderDetail } from '@/hooks/useOrders'

export const RETURN_REASONS = [
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'wrong_item', label: 'Wrong item sent' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Something else' },
] as const
export type ReturnReasonValue = (typeof RETURN_REASONS)[number]['value']
export const returnReasonLabel = (r?: string | null) => RETURN_REASONS.find((x) => x.value === r)?.label ?? r ?? ''

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const NOTE_MAX = 500

/** Delivered within the last 7 days? Uses `deliveredAt`, falling back to the timeline's delivered entry. */
export function returnWindow(order: Pick<OrderDetail, 'status' | 'deliveredAt' | 'timeline'>) {
  if (order.status !== 'delivered') return null
  const at = order.deliveredAt ?? [...order.timeline].reverse().find((t) => t.status === 'delivered')?.at
  if (!at) return null
  const closes = new Date(at).getTime() + RETURN_WINDOW_MS
  return closes > Date.now() ? new Date(closes) : null
}

export function ReturnDialog({ order, open, onOpenChange, onDone }: { order: OrderDetail; open: boolean; onOpenChange: (o: boolean) => void; onDone: (o: OrderDetail) => void }) {
  const id = useId()
  const [reason, setReason] = useState<ReturnReasonValue | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!reason) { setError('Pick a reason so we can sort it quickly.'); return }
    setPending(true)
    setError(null)
    try {
      const r = await api.post<{ order: OrderDetail }>(`/orders/${order._id}/return`, { reason, ...(note.trim() ? { note: note.trim() } : {}) })
      toast.success('Return requested — we’ll be in touch within a day')
      onDone(r.order)
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e, 'Couldn’t request the return.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o) }}>
      <DialogContent className="gap-0 rounded-[22px] border-line bg-surface p-0 sm:max-w-[520px]">
        <div className="max-h-[88dvh] overflow-y-auto p-5 sm:p-7">
          <DialogHeader className="mb-5 text-left">
            <DialogTitle className="font-display text-[1.6rem] font-medium">Return {order.orderNumber}</DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed text-muted">Tell us what went wrong. Once approved, refunds go back to your original payment method.</DialogDescription>
          </DialogHeader>
          <FormBanner show={!!error} className="mb-4">{error}</FormBanner>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink">Reason</legend>
            <div className="flex flex-col gap-2" role="radiogroup">
              {RETURN_REASONS.map((r) => (
                <label key={r.value} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors', 'border-line hover:border-ink/25 has-[input:checked]:border-ink has-[input:checked]:bg-surface-2/60', 'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent')}>
                  <input type="radio" name={`${id}-reason`} value={r.value} checked={reason === r.value} onChange={() => { setReason(r.value); setError(null) }} className="peer sr-only" />
                  <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center rounded-full border border-line peer-checked:border-ink peer-checked:bg-ink">
                    <span className="size-1.5 rounded-full bg-bg" />
                  </span>
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor={`${id}-note`} className="mt-5 block text-[13px] font-medium text-ink">Details <span className="font-normal text-muted">optional</span></label>
          <textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))} rows={3} maxLength={NOTE_MAX} placeholder="A photo-worthy description helps — e.g. which item, what’s wrong." className={cn(inputClass, 'mt-1.5 h-auto resize-none py-2.5 leading-relaxed')} />
          <p className="mt-1 text-right text-[12px] text-muted tabular">{note.length}/{NOTE_MAX}</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close className={pill('ghost')} disabled={pending}>Not now</DialogPrimitive.Close>
            <PillButton onClick={submit} loading={pending} loadingText="Sending…">Request return</PillButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
