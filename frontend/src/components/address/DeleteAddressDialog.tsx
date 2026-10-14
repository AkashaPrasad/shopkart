import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { PillButton, pill } from '@/components/auth/form'
import type { Address } from '@/types'

/** Confirm-before-delete. Explains default promotion so nobody is surprised at checkout. */
export function DeleteAddressDialog({ address, others, onOpenChange, onConfirm }: {
  address: Address | null
  /** Number of other saved addresses. */
  others: number
  onOpenChange: (open: boolean) => void
  onConfirm: (address: Address) => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const confirm = async () => {
    if (!address) return
    setPending(true)
    try {
      await onConfirm(address)
      toast.success('Address removed')
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t remove that address.'))
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog open={!!address} onOpenChange={(o) => { if (!pending) onOpenChange(o) }}>
      <AlertDialogContent className="rounded-[20px] border-line bg-surface p-6 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl font-medium">Remove this address?</AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-relaxed text-muted">
            {address ? <><span className="font-medium text-ink">{address.fullName}</span>, {address.line1}, {address.city}. </> : null}
            {address?.isDefault && others > 0
              ? 'It’s your default — your most recently added address will become the new default.'
              : address?.isDefault
                ? 'It’s your only address; you’ll add a new one at checkout.'
                : 'Past orders keep their own copy, so nothing already shipped is affected.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2">
          <AlertDialogPrimitive.Cancel className={pill('ghost')} disabled={pending}>Keep it</AlertDialogPrimitive.Cancel>
          <PillButton variant="danger" onClick={confirm} loading={pending} loadingText="Removing…">Remove address</PillButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
