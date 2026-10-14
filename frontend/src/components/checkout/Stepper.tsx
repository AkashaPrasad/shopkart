import { Fragment } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckoutStep = 'address' | 'review' | 'pay'
export const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'review', label: 'Review' },
  { id: 'pay', label: 'Pay' },
]

/**
 * Three-step progress. Mobile: compact chips. ≥sm: numbered steps joined by hairlines.
 * Completed steps are buttons (go back); the current/future ones are inert.
 */
export function Stepper({ current, onSelect, locked }: { current: CheckoutStep; onSelect: (s: CheckoutStep) => void; locked?: boolean }) {
  const idx = STEPS.findIndex((s) => s.id === current)
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-1.5 sm:gap-0">
        {STEPS.map((s, i) => {
          const done = i < idx
          const active = i === idx
          const clickable = done && !locked
          const inner = (
            <>
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular transition-colors duration-300 sm:size-7 sm:text-xs',
                  done && 'bg-ink text-bg',
                  active && 'bg-accent text-accent-ink sm:bg-ink sm:text-bg sm:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ink)_10%,transparent)]',
                  !done && !active && 'border border-line text-muted',
                )}
              >
                {done ? <Check className="size-3 sm:size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn('text-[13px] font-medium sm:text-sm', active ? 'text-ink' : done ? 'text-ink' : 'text-muted')}>{s.label}</span>
              {done ? <span className="sr-only">(completed)</span> : null}
            </>
          )
          const chip = cn(
            'inline-flex h-8 items-center gap-2 rounded-full border pr-3 pl-1.5 sm:h-auto sm:border-0 sm:p-0',
            active ? 'border-ink bg-surface' : 'border-line',
          )
          return (
            <Fragment key={s.id}>
              {i > 0 ? (
                <li aria-hidden="true" className="relative mx-3 hidden h-px flex-1 bg-line sm:block">
                  <span className={cn('absolute inset-y-0 left-0 bg-ink transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', i <= idx ? 'w-full' : 'w-0')} />
                </li>
              ) : null}
              <li aria-current={active ? 'step' : undefined} className="shrink-0">
                {clickable ? (
                  <button type="button" onClick={() => onSelect(s.id)} className={cn(chip, 'transition-colors hover:border-ink/40 sm:rounded-full sm:hover:opacity-75')} aria-label={`Step ${i + 1}: ${s.label}, go back`}>
                    {inner}
                  </button>
                ) : (
                  <span className={chip}>{inner}</span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
