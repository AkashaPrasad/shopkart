import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/store/cart'
import { money, plural } from '@/lib/format'
import { SlideOver, SlideOverClose } from './SlideOver'
import { CartLine } from './CartLine'
import { FreeShippingBar } from './FreeShippingBar'
import { lineIssue, useCartHydrated } from './cartActions'
import { Shimmer } from '@/components/product/Shimmer'

/** Slide-over cart. Opened by the header cart button and automatically after add-to-cart (cart.openDrawer()). */
export function MiniCart() {
  const open = useCart(s => s.drawerOpen)
  const closeDrawer = useCart(s => s.closeDrawer)
  const openDrawer = useCart(s => s.openDrawer)
  const cart = useCart(s => s.cart)
  const hydrated = useCartHydrated()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Close on route change (e.g. back button while open).
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current !== pathname) { lastPath.current = pathname; closeDrawer() }
  }, [pathname, closeDrawer])

  const { items, summary } = cart
  const coupon = cart.couponError ? null : cart.coupon
  const blocked = items.some(i => lineIssue(i))
  const count = summary.itemCount

  function go(to: string) { closeDrawer(); navigate(to) }

  return (
    <SlideOver open={open} onOpenChange={o => (o ? openDrawer() : closeDrawer())} title="Your cart" description={count ? plural(count, 'item') + ' in your cart' : 'Your cart is empty'}>
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <h2 className="font-display text-2xl">
          Your <em className="italic">cart</em>
          {count > 0 ? <span className="ml-2 align-middle font-sans text-sm font-medium tracking-normal text-muted tabular">({count})</span> : null}
        </h2>
        <SlideOverClose className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-muted transition-[color,background-color,border-color,transform] hover:bg-surface-2 hover:text-ink active:scale-[0.98]" aria-label="Close cart">
          <X className="h-5 w-5" aria-hidden="true" />
        </SlideOverClose>
      </header>

      {!hydrated ? (
        <div className="flex-1 space-y-5 px-5 py-6 sm:px-6" aria-busy="true" aria-label="Loading cart">
          {[0, 1].map(i => (
            <div key={i} className="flex gap-3.5">
              <Shimmer className="aspect-[4/5] w-[68px] rounded-[10px]" />
              <div className="flex-1 space-y-2 pt-1">
                <Shimmer className="h-4 w-2/3 rounded-full" />
                <Shimmer className="h-3 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-6 grid h-20 w-20 place-items-center rounded-full bg-surface-2">
            <ShoppingBag className="h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full border-4 border-bg bg-accent" aria-hidden="true" />
          </div>
          <h3 className="font-display text-3xl">Feeling <em className="italic">light</em>.</h3>
          <p className="mt-2 max-w-[16rem] text-sm text-muted text-pretty">Your cart is empty. Small objects, big joy. Go find one.</p>
          <button
            type="button"
            onClick={() => go('/shop')}
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          >
            Start browsing <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <FreeShippingBar summary={summary} />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5 sm:px-6">
            {items.map(item => (
              <CartLine key={item.product._id} item={item} variant="drawer" onNavigate={closeDrawer} />
            ))}
          </ul>
          <footer className="border-t border-line bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
            <dl className="space-y-1.5 tabular">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-muted">Subtotal</dt>
                <dd className="text-lg font-semibold">{money(summary.subtotal)}</dd>
              </div>
              {summary.discount > 0 ? (
                <div className="flex items-baseline justify-between text-sm">
                  <dt className="text-muted">Discount{coupon ? ` · ${coupon}` : ''}</dt>
                  <dd className="font-medium text-success">−{money(summary.discount)}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-1 text-xs text-muted">
              {summary.shipping === 0 ? 'Free shipping. ' : `${money(summary.shipping)} shipping. `}Coupons and totals confirmed at checkout.
            </p>
            {blocked ? <p className="mt-3 text-sm text-danger" role="alert">Some items need attention before checkout.</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to="/cart"
                onClick={closeDrawer}
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-bg text-sm font-semibold transition-[color,background-color,border-color,transform] hover:border-ink active:scale-[0.98]"
              >
                View cart
              </Link>
              <button
                type="button"
                onClick={() => go(blocked ? '/cart' : '/checkout')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-ink shadow-[0_10px_24px_-12px_var(--accent)] transition-[filter,transform] hover:brightness-[1.04] active:scale-[0.98]"
              >
                {blocked ? 'Review cart' : 'Checkout'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </>
      )}
    </SlideOver>
  )
}
