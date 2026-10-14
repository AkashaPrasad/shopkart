import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useIsSaved, useWishlist } from '@/store/wishlist'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CartProduct } from '@/types'

const DOTS = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2 - Math.PI / 2)

/**
 * Save-for-later toggle. `overlay`: round button over a product image. `pill`: PDP "Save" / "Saved" button
 * (icon-only below sm). Optimistic; pops + bursts on save (static with reduced motion).
 */
export function HeartButton({ product, variant = 'overlay', className }: { product: CartProduct; variant?: 'overlay' | 'pill'; className?: string }) {
  const saved = useIsSaved(product._id)
  const toggle = useWishlist(s => s.toggle)
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const [burst, setBurst] = useState(0)

  useEffect(() => {
    if (!burst || reduce || !scope.current) return
    animate(scope.current, { scale: [1, 1.35, 0.9, 1] }, { duration: 0.3, ease: 'easeOut' })
  }, [burst, reduce, animate, scope])

  async function onClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const willSave = !saved
    if (willSave) setBurst(b => b + 1)
    try {
      await toggle(product)
      if (willSave) {
        toast.success(`Saved ${product.name}`, { description: 'It’s waiting in your wishlist.', action: { label: 'View', onClick: () => navigate('/wishlist') } })
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t update your wishlist. Try again.'))
    }
  }

  const icon = (
    <span className="relative grid place-items-center">
      <span ref={scope} className="grid place-items-center">
        <Heart
          className={cn('transition-colors duration-200', variant === 'pill' ? 'h-[18px] w-[18px]' : 'h-[17px] w-[17px]', saved ? 'fill-accent text-accent' : 'text-ink')}
          strokeWidth={saved ? 0 : 1.9}
          aria-hidden="true"
        />
      </span>
      <AnimatePresence>
        {burst && !reduce && saved ? (
          <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden="true">
            {DOTS.map((a, i) => (
              <motion.span
                key={i}
                className={cn('absolute left-1/2 top-1/2 -ml-[2px] -mt-[2px] h-1 w-1 rounded-full', i % 2 ? 'bg-accent' : 'bg-warning')}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(a) * 15, y: Math.sin(a) * 15, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </span>
        ) : null}
      </AnimatePresence>
    </span>
  )

  const label = saved ? `Remove ${product.name} from your wishlist` : `Save ${product.name} to your wishlist`

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[border-color,background-color,transform] duration-200 active:scale-[0.98] max-sm:w-12 max-sm:px-0',
          saved ? 'border-accent/40 bg-accent/5 text-ink' : 'border-line bg-surface hover:border-ink',
          className,
        )}
      >
        {icon}
        <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Saved' : 'Save for later'}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow-[var(--shadow-soft)] backdrop-blur transition-[transform,background-color] duration-200 hover:scale-105 hover:bg-surface active:scale-95',
        className,
      )}
    >
      {icon}
    </button>
  )
}
