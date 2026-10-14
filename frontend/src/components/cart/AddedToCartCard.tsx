import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, X } from 'lucide-react'
import { useCart } from '@/store/cart'
import { money, plural } from '@/lib/format'
import { ProductImage } from '@/components/product/ProductImage'
import { productImage } from './cartActions'

const EASE = [0.22, 1, 0.36, 1] as const
const VISIBLE_MS = 4000
/** Pages where the card would be redundant: the shopper is already looking at the cart. */
const QUIET_PATHS = ['/cart', '/checkout']

/**
 * Compact confirmation after every add-to-cart (replaces opening the drawer). Bottom-right on desktop,
 * bottom-centre on phones (lifted above any sticky bottom bar via `--sk-bottom-bar`). Auto-dismisses after 4s,
 * pausing while hovered or focused; adding again swaps the content with a small bump.
 */
export function AddedToCartCard() {
  const lastAddedAt = useCart(s => s.lastAddedAt)
  const item = useCart(s => s.lastAdded)
  const summary = useCart(s => s.cart.summary)
  const drawerOpen = useCart(s => s.drawerOpen)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const seen = useRef(lastAddedAt)
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open }, [open])

  // A new add: show (or refresh) the card.
  useEffect(() => {
    if (!lastAddedAt || lastAddedAt === seen.current) return
    seen.current = lastAddedAt
    if (QUIET_PATHS.some(p => pathname.startsWith(p)) || useCart.getState().drawerOpen) return
    if (openRef.current && !reduce && scope.current) animate(scope.current, { scale: [1, 1.025, 1] }, { duration: 0.3, ease: EASE })
    setOpen(true)
  }, [lastAddedAt, pathname, reduce, animate, scope])

  // Auto-dismiss, restarting on every add and pausing while the shopper interacts with it.
  useEffect(() => {
    if (!open || paused) return
    const t = window.setTimeout(() => setOpen(false), VISIBLE_MS)
    return () => window.clearTimeout(t)
  }, [open, paused, lastAddedAt])

  // Leaving the page or opening the drawer makes it redundant.
  const [route, setRoute] = useState(pathname)
  if (route !== pathname) { setRoute(pathname); if (open) setOpen(false) }
  if (drawerOpen && open) setOpen(false)

  function go(to: string) { setOpen(false); navigate(to) }

  const product = item?.product
  const unit = item && item.qty > 0 ? Math.round(item.lineTotal / item.qty) : product?.price ?? 0

  return (
    <div
      className="pointer-events-none fixed inset-x-3 z-40 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"
      style={{ bottom: 'calc(max(0.75rem, env(safe-area-inset-bottom)) + var(--sk-bottom-bar, 0px))' }}
      aria-live="polite"
    >
      <AnimatePresence>
        {open && item && product ? (
          <motion.div
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-auto w-full max-w-[380px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false) }}
          >
            <div ref={scope} className="rounded-[18px] border border-line bg-surface p-3.5 shadow-[var(--shadow-lift)]">
              <div className="flex items-start gap-3">
                <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">
                  <ProductImage src={productImage(product)} alt="" sizes="48px" eager />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />Added to cart
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted tabular">
                    {item.color ? `${item.color} · ` : ''}{item.qty} × {money(unit)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Dismiss"
                  className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5 text-xs tabular">
                <span className="text-muted">Cart subtotal · {plural(summary.itemCount, 'item')}</span>
                <span className="text-sm font-semibold text-ink">{money(summary.subtotal)}</span>
              </div>
              {summary.amountToFreeShipping > 0 ? (
                <p className="mt-0.5 text-right text-[11px] text-muted tabular">{money(summary.amountToFreeShipping)} more for free shipping</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => go('/cart')}
                  className="h-10 rounded-full border border-line text-sm font-semibold transition-[border-color,transform] hover:border-ink active:scale-[0.98]"
                >
                  View cart
                </button>
                <button
                  type="button"
                  onClick={() => go('/checkout')}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-semibold text-accent-ink transition-[filter,transform] hover:brightness-[1.04] active:scale-[0.98]"
                >
                  Checkout <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
