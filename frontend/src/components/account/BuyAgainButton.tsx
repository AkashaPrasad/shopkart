import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { useCart } from '@/store/cart'
import { describeSkip, reorder } from '@/hooks/useOrders'
import { PillButton, type PillVariant } from '@/components/auth/form'

/** Re-adds an order's still-available items to the bag, opens the mini-cart and explains anything skipped. */
export function BuyAgainButton({ orderId, lineCount, variant = 'outline', className }: { orderId: string; /** distinct products in the order */ lineCount: number; variant?: PillVariant; className?: string }) {
  const [pending, setPending] = useState(false)
  const run = async () => {
    if (pending) return
    setPending(true)
    try {
      const { skipped = [] } = await reorder(orderId)
      const nothingAdded = skipped.length >= lineCount && skipped.every((x) => !x.addedQty)
      if (nothingAdded) {
        toast.error('None of these are available right now', { description: skipped.map(describeSkip).join(' · '), duration: 7000 })
        return
      }
      await useCart.getState().refresh().catch(() => {})
      useCart.getState().openDrawer()
      if (skipped.length) toast.warning('Added what we could to your bag', { description: skipped.map(describeSkip).join(' · '), duration: 7000 })
      else toast.success('Back in your bag')
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t add these to your bag.'))
    } finally {
      setPending(false)
    }
  }
  return (
    <PillButton variant={variant} onClick={run} loading={pending} loadingText="Adding…" className={className}>
      <RotateCcw className="size-4" />Buy again
    </PillButton>
  )
}
