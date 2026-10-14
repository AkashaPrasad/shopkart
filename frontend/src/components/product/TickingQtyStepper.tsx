import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Same API and look as shared/QtyStepper, but the number ticks up/down (slides in from the direction of change)
 * and the buttons have press feedback. Reduced motion: instant swap.
 */
export function TickingQtyStepper({ value, min = 1, max = 10, onChange, disabled, size = 'md', className, allowRemove = false, tone = 'default' }: {
  value: number; min?: number; max?: number; onChange: (n: number) => void; disabled?: boolean; size?: 'sm' | 'md'; className?: string
  /** When true, pressing minus at the minimum calls onChange(min - 1) and the button shows a bin icon (UK-style remove). */
  allowRemove?: boolean
  /** accent: filled tangerine control used in place of an Add-to-cart button. */
  tone?: 'default' | 'accent'
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
  const accent = tone === 'accent'
  const atMin = value <= min
  const btn = cn('grid aspect-square h-full place-items-center transition-[background-color,transform] duration-150 active:scale-90 disabled:opacity-35 disabled:hover:bg-transparent disabled:active:scale-100', accent ? 'text-accent-ink hover:bg-black/10' : 'text-ink hover:bg-surface-2')
  return (
    <div className={cn('inline-flex items-center overflow-hidden rounded-full border', accent ? 'border-accent bg-accent text-accent-ink shadow-[0_10px_24px_-12px_var(--accent)]' : 'border-line bg-surface', h, className)} role="group" aria-label="Quantity">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || (atMin && !allowRemove)}
        aria-label={atMin && allowRemove ? 'Remove from cart' : 'Decrease quantity'}
      >
        {atMin && allowRemove ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className={cn('relative grid h-full min-w-8 place-items-center overflow-hidden text-sm font-semibold tabular', accent && 'min-w-9')} aria-live="polite">
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
