import type { ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type Side = 'right' | 'left' | 'top'

const PANEL: Record<Side, string> = {
  right: 'inset-y-0 right-0 h-dvh w-full max-w-[440px] border-l',
  left: 'inset-y-0 left-0 h-dvh w-[88vw] max-w-[380px] border-r',
  top: 'inset-x-0 top-0 max-h-dvh w-full border-b',
}
const OFFSET: Record<Side, { x?: string; y?: string }> = { right: { x: '100%' }, left: { x: '-100%' }, top: { y: '-100%' } }

/**
 * Accessible slide-over panel (Radix Dialog for focus trap / Esc / aria) animated with motion,
 * including a proper exit animation. `title` labels the dialog for assistive tech; render any visible heading inside.
 * Used by the mini cart, mobile nav and mobile search.
 */
export function SlideOver({ open, onOpenChange, side = 'right', title, description, className, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: Side
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const hidden = reduce ? { opacity: 0 } : { ...OFFSET[side], opacity: 1 }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgb(20_14_4/0.32)] backdrop-blur-[2px] dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount {...(description ? {} : { 'aria-describedby': undefined })}>
              <motion.div
                className={cn('fixed z-50 flex flex-col border-line bg-bg text-ink shadow-[var(--shadow-lift)] outline-none', PANEL[side], className)}
                initial={hidden}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={hidden}
                transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: reduce ? 0.15 : 0.42 }}
              >
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                {description ? <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description> : null}
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

export const SlideOverClose = DialogPrimitive.Close
