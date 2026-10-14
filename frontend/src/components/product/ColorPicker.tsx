import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import type { ProductColor } from '@/types'
import { cn } from '@/lib/utils'

function isLight(hex: string) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return false
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 170
}

/**
 * Swatch radio group. Bump `shake` (any changing number) to shake it and show the hint, e.g. when the
 * shopper tries to add to cart without choosing a colour.
 */
export function ColorPicker({ colors, value, onChange, shake = 0, showHint = false, className }: {
  colors: ProductColor[]
  value: string | null
  onChange: (name: string) => void
  shake?: number
  showHint?: boolean
  className?: string
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduce = useReducedMotion()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!shake || !scope.current) return
    if (!reduce) animate(scope.current, { x: [0, -8, 8, -6, 6, -2, 0] }, { duration: 0.45, ease: 'easeOut' })
    const first = buttons.current[0]
    first?.focus({ preventScroll: true })
  }, [shake, reduce, animate, scope])

  const selectedIndex = Math.max(0, colors.findIndex(c => c.name === value))

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const current = colors.findIndex(c => c.name === value)
    const next = (current + dir + colors.length) % colors.length
    onChange(colors[next].name)
    buttons.current[next]?.focus()
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <span className="text-sm text-muted" id="color-label">
          Colour{value ? <> — <span className="font-medium text-ink">{value}</span></> : null}
        </span>
        {showHint && !value ? <span className="text-sm font-medium text-danger" role="alert">Pick a colour first</span> : null}
      </div>
      <div ref={scope} role="radiogroup" aria-labelledby="color-label" aria-required="true" className="flex flex-wrap gap-3" onKeyDown={onKeyDown}>
        {colors.map((c, i) => {
          const selected = c.name === value
          return (
            <button
              key={c.name}
              ref={el => { buttons.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.name}
              title={c.name}
              tabIndex={i === selectedIndex ? 0 : -1}
              onClick={() => onChange(c.name)}
              className={cn(
                'relative grid h-10 w-10 place-items-center rounded-full ring-offset-2 ring-offset-bg transition-[box-shadow,transform] duration-200 hover:scale-105',
                selected ? 'ring-2 ring-ink' : 'ring-1 ring-transparent hover:ring-line',
                showHint && !value && 'ring-1 ring-danger/60',
              )}
            >
              <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ backgroundColor: c.hex }} />
              {selected ? <Check className={cn('relative h-4 w-4', isLight(c.hex) ? 'text-black' : 'text-white')} strokeWidth={2.5} aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
