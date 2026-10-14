import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Same API and look as shared/QtyStepper, but the number ticks up/down (slides in from the direction of change)
 * and the buttons have press feedback. Reduced motion: instant swap.
 */
export function TickingQtyStepper({ value, min = 1, max = 10, onChange, disabled, size = 'md', className }: {
  value: number; min?: number; max?: number; onChange: (n: number) => void; disabled?: boolean; size?: 'sm' | 'md'; className?: string
}) {
  const reduce = useReducedMotion()
  const [last, setLast] = useState(value)
  const [dir, setDir] = useState(1)
  if (value !== last) { setDir(value > last ? 1 : -1); setLast(value) }
  const shift = reduce ? 0 : 14
  const variants = {
    enter: (d: number) => ({ y: d * shift, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (d: number) => ({ y: -d * shift, opacity: 0 }),
  }
  const h = size === 'sm' ? 'h-9' : 'h-11'
  const btn = 'grid aspect-square h-full place-items-center text-ink transition-[background-color,transform] duration-150 hover:bg-surface-2 active:scale-90 disabled:opacity-35 disabled:hover:bg-transparent disabled:active:scale-100'
  return (
    <div className={cn('inline-flex items-center overflow-hidden rounded-full border border-line bg-surface', h, className)} role="group" aria-label="Quantity">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
      <span className="relative grid h-full min-w-8 place-items-center overflow-hidden text-sm font-semibold tabular" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.span
            key={value}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
    </div>
  )
}
