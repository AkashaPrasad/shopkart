import { useCallback, useId, useState, type ReactNode } from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { toast } from 'sonner'
import { ApiError, errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { setOrderStatus, isCod, paidOnline } from '@/hooks/useAdmin'
import type { AdminOrder, AdminOrderStatus } from '@/types'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { PillButton, pill, type PillVariant } from '@/components/auth/form'

const NOTE_MAX = 300

/**
 * Confirm dialog for a status change, with an optional (or required) note that
 * lands on the order timeline. Stays open on failure so the note isn't lost.
 */
export function StatusDialog({
  open, onOpenChange, title, description, confirmLabel, busyLabel, tone = 'ink', noteLabel = 'Note for the timeline', noteRequired, notePlaceholder, busy, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  busyLabel?: string
  tone?: PillVariant
  noteLabel?: string
  noteRequired?: boolean
  notePlaceholder?: string
  busy: boolean
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const id = useId()
  // Fresh note every time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) { setWasOpen(open); if (open) { setNote(''); setTouched(false) } }
  const missing = noteRequired && note.trim().length === 0
  const showError = touched && missing

  const change = (o: boolean) => {
    if (busy) return
    onOpenChange(o)
  }
  const confirm = () => {
    setTouched(true)
    if (missing) return
    onConfirm(note.trim())
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent className="rounded-[20px] border-line bg-surface p-6 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl font-medium">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-[15px] leading-relaxed text-muted">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-[13px] font-medium text-ink">
            {noteLabel}{noteRequired ? null : <span className="ml-1.5 font-normal text-muted">optional</span>}
          </label>
          <textarea
            id={id}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            onBlur={() => setTouched(true)}
            rows={3}
            placeholder={notePlaceholder}
            aria-invalid={showError}
            aria-describedby={`${id}-hint`}
            disabled={busy}
            className={cn(
              'w-full resize-none rounded-xl border bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted/60 focus:ring-[3px] disabled:opacity-60',
              showError ? 'border-danger/70 focus:ring-danger/10' : 'border-line hover:border-ink/25 focus:border-ink/70 focus:ring-ink/[0.07]',
            )}
          />
          <p id={`${id}-hint`} className={cn('flex justify-between gap-3 text-[12px]', showError ? 'text-danger' : 'text-muted')}>
            <span>{showError ? 'Add a short note — the customer sees it on their order.' : 'Shown on the order timeline.'}</span>
            <span className="tabular">{note.length}/{NOTE_MAX}</span>
          </p>
        </div>
        <AlertDialogFooter className="mt-1 gap-2">
          <AlertDialogPrimitive.Cancel className={pill('ghost')} disabled={busy}>Keep as is</AlertDialogPrimitive.Cancel>
          <PillButton variant={tone} onClick={confirm} loading={busy} loadingText={busyLabel}>{confirmLabel}</PillButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Toast copy for a finished transition, including what happened to the money. */
export function announce(order: AdminOrder, to: AdminOrderStatus) {
  const num = order.orderNumber
  const refund = order.payment?.refundStatus
  if (to === 'cancelled' || to === 'returned') {
    const verb = to === 'cancelled' ? 'cancelled' : 'returned'
    if (refund === 'failed') return toast.warning(`${num} ${verb}, but the refund failed`, { description: 'Retry it from the Razorpay dashboard.' })
    if (refund === 'manual' || (to === 'returned' && isCod(order))) return toast.success(`${num} ${verb}`, { description: `Refund ${money(order.total)} to the customer manually (cash on delivery).` })
    if (refund === 'processed' || refund === 'pending' || paidOnline(order)) return toast.success(`${num} ${verb} — refund started`, { description: `${money(order.total)} back to the original payment method.` })
    return toast.success(`${num} ${verb}`, { description: to === 'cancelled' ? 'Nothing was charged, so there’s nothing to refund. Stock is back on the shelf.' : undefined })
  }
  if (to === 'delivered' && order.status === 'delivered' && order.return) return toast.success(`Return rejected — ${num} stays delivered`)
  if (to === 'delivered' && isCod(order)) return toast.success(`${num} delivered`, { description: `${money(order.total)} cash collected.` })
  return toast.success(`${num} marked ${to}`)
}

/**
 * Runs a status change. 409s (someone else moved the order on) become an inline
 * message plus a refetch; other errors toast. Resolves true on success.
 */
export function useOrderTransition({ onUpdated, onConflict }: { onUpdated: (o: AdminOrder, to: AdminOrderStatus) => void; onConflict?: () => void }) {
  const [pending, setPending] = useState<{ id: string; to: AdminOrderStatus } | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  const run = useCallback(async (order: Pick<AdminOrder, '_id'>, to: AdminOrderStatus, note?: string) => {
    setPending({ id: order._id, to })
    setConflict(null)
    try {
      const updated = await setOrderStatus(order._id, to, note)
      onUpdated(updated, to)
      announce(updated, to)
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflict(e.message || 'This order has moved on since you opened it.')
        onConflict?.()
        return true // close any dialog: the banner explains what happened
      }
      toast.error(errorMessage(e, 'Couldn’t update this order.'))
      return false
    } finally {
      setPending(null)
    }
  }, [onUpdated, onConflict])

  return { run, pending, conflict, clearConflict: () => setConflict(null) }
}
