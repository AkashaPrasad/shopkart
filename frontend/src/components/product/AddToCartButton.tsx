import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Loader2, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/store/cart'
import { errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import { toLite } from '@/hooks/useProducts'
import { flyToCart } from '@/components/shared/FlyToCart'
import { productImage, useLineActions } from '@/components/cart/cartActions'
import { TickingQtyStepper } from './TickingQtyStepper'
import { cn } from '@/lib/utils'
import type { CartProduct } from '@/types'

const EASE = [0.22, 1, 0.36, 1] as const

interface Props {
  product: CartProduct
  qty?: number
  color?: string | null
  /** When true and no colour is chosen, `onMissingColor` is called instead of adding. */
  requireColor?: boolean
  onMissingColor?: () => void
  /** full: PDP primary CTA (accent). compact: card "+ Add". block: full-width ink button (wishlist). */
  variant?: 'full' | 'compact' | 'block'
  className?: string
}

function inViewport(el: Element) {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
}

/**
 * Add-to-cart with pending, "Added" and sold-out states. On success the product image flies to the header cart
 * (from the nearest `[data-fly-source]` inside the closest `[data-fly-scope]`) and the badge bumps; the global
 * AddedToCartCard (driven by the cart store's `lastAddedAt`) confirms the add. The drawer is not opened here.
 */
export function AddToCartButton({ product, qty = 1, color = null, requireColor = false, onMissingColor, variant = 'full', className }: Props) {
  const add = useCart(s => s.add)
  const line = useCart(s => s.cart.items.find(i => i.product && i.product._id === product._id))
  const linePending = useCart(s => !!s.pending[product._id])
  const { changeQty, removeLine } = useLineActions()
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<'idle' | 'pending' | 'added'>('idle')
  const btn = useRef<HTMLButtonElement>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const soldOut = product.stock <= 0

  async function onClick() {
    if (soldOut || phase !== 'idle') return
    if (requireColor && !color) { onMissingColor?.(); return }
    setPhase('pending')
    try {
      await add(toLite(product), qty, color)
    } catch (e) {
      setPhase('idle')
      toast.error(errorMessage(e, 'Couldn’t add that to your cart. Try again.'))
      return
    }
    setPhase('added')
    const source = btn.current?.closest('[data-fly-scope]')?.querySelector('[data-fly-source]')
    const flight = flyToCart(source && inViewport(source) ? source : btn.current, productImage(product))
    const hold = new Promise(r => window.setTimeout(r, variant === 'full' ? 1200 : 1000))
    await Promise.all([flight, hold])
    if (alive.current) setPhase('idle')
  }

  const swap = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: 0.2, ease: EASE },
  }
  const label = soldOut ? `${product.name} is sold out` : undefined

  // Already in the cart → show a − n + control instead of the button (minus at 1 removes the line).
  if (line && phase === 'idle' && !soldOut) {
    const max = Math.max(1, Math.min(10, product.stock))
    const full = variant === 'full'
    return (
      <div className={cn('inline-flex items-center gap-2.5', full && 'w-full', className)} data-in-cart>
        <TickingQtyStepper
          value={line.qty}
          min={1}
          max={max}
          allowRemove
          tone={full ? 'accent' : 'default'}
          size={full ? 'md' : 'sm'}
          disabled={linePending}
          onChange={n => (n < 1 ? removeLine(line) : changeQty(line, Math.min(max, n)))}
          className={cn(full ? 'h-12 flex-1 justify-between px-1' : '', linePending && 'opacity-60')}
        />
        {full ? <span className="text-sm text-muted tabular whitespace-nowrap">{line.qty} in cart</span> : null}
      </div>
    )
  }

  if (variant === 'compact' || variant === 'block') {
    const block = variant === 'block'
    return (
      <button
        ref={btn}
        type="button"
        onClick={onClick}
        disabled={soldOut || phase === 'pending'}
        aria-label={label ?? (block ? undefined : `Add ${product.name} to cart`)}
        aria-busy={phase === 'pending'}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98]',
          block ? 'h-11 w-full font-semibold' : 'h-9 px-3.5',
          soldOut
            ? 'cursor-not-allowed border-line bg-transparent text-muted active:scale-100'
            : phase === 'added'
              ? 'border-success bg-success text-white'
              : block
                ? 'border-ink bg-ink text-bg hover:opacity-90'
                : 'border-line bg-surface text-ink hover:border-ink hover:bg-ink hover:text-bg',
          className,
        )}
      >
        {soldOut ? 'Sold out' : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={phase} {...swap} className="inline-flex items-center gap-1.5">
              {phase === 'pending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : phase === 'added' ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                : block ? <ShoppingBag className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              <span>{phase === 'added' ? 'Added' : block ? 'Add to cart' : 'Add'}</span>
            </motion.span>
          </AnimatePresence>
        )}
      </button>
    )
  }

  return (
    <button
      ref={btn}
      type="button"
      onClick={onClick}
      disabled={soldOut || phase === 'pending'}
      aria-busy={phase === 'pending'}
      className={cn(
        'relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full px-6 text-[15px] font-semibold transition-[background-color,transform,box-shadow,filter] duration-200 active:scale-[0.98]',
        soldOut
          ? 'cursor-not-allowed bg-surface-2 text-muted active:scale-100'
          : phase === 'added'
            ? 'bg-success text-white'
            : 'bg-accent text-accent-ink shadow-[0_10px_24px_-12px_var(--accent)] hover:brightness-[1.04]',
        className,
      )}
    >
      {soldOut ? 'Sold out' : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={phase} {...swap} className="inline-flex items-center gap-2">
            {phase === 'pending' ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Adding…</>
              : phase === 'added' ? <><Check className="h-[18px] w-[18px]" strokeWidth={2.75} aria-hidden="true" />Added</>
              : <><ShoppingBag className="h-4 w-4" aria-hidden="true" />Add to cart<span className="tabular font-medium opacity-80">· {money(product.price * qty)}</span></>}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  )
}
