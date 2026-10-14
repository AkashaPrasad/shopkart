import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Lock, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { CartLine } from '@/components/cart/CartLine'
import { CartSummary } from '@/components/cart/CartSummary'
import { CouponInput } from '@/components/cart/CouponInput'
import { FreeShippingBar } from '@/components/cart/FreeShippingBar'
import { lineIssue, useCartHydrated } from '@/components/cart/cartActions'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useCart } from '@/store/cart'
import { errorMessage } from '@/lib/api'
import { money, plural } from '@/lib/format'
import { Shimmer } from '@/components/product/Shimmer'

export default function CartPage() {
  const cart = useCart(s => s.cart)
  const clear = useCart(s => s.clear)
  const applyCoupon = useCart(s => s.applyCoupon)
  const removeCoupon = useCart(s => s.removeCoupon)
  const hydrated = useCartHydrated()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const { items, summary } = cart
  const coupon = { code: cart.coupon ?? null, valid: !cart.couponError, message: cart.couponError ?? null }
  const issues = items.filter(i => lineIssue(i)).length
  const blocked = issues > 0

  if (!hydrated) return <CartSkeleton />

  if (items.length === 0) {
    return (
      <div className="container-x py-14 sm:py-20">
        <Seo title="Your cart" description="Your ShopKart cart." />
        <h1 className="mb-10 font-display text-5xl sm:text-6xl">Your <em className="italic text-accent">cart</em></h1>
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" aria-hidden="true" />}
          title="Nothing here yet"
          description="Small objects, honest prices. Go on, treat your desk."
          action={
            <Link to="/shop" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]">
              Browse the shop <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
      </div>
    )
  }

  async function onApply(code: string) {
    await applyCoupon(code)
    const s = useCart.getState().cart.summary
    toast.success(`${code} applied`, {
      description: s.discount > 0 ? `You’re saving ${money(s.discount)}.` : s.shipping === 0 ? 'Shipping’s on us.' : undefined,
    })
  }

  async function onRemoveCoupon() {
    await removeCoupon()
    toast('Coupon removed')
  }

  async function onClear() {
    setClearing(true)
    try {
      await clear()
      setConfirmOpen(false)
      toast('Cart cleared. Fresh start.')
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t clear your cart. Try again.'))
    } finally { setClearing(false) }
  }

  const couponHint = coupon.code && coupon.valid && summary.discount === 0 && summary.amountToFreeShipping === 0
    ? 'Shipping is already free on this order, so this code has nothing to do yet.'
    : undefined

  return (
    <>
      <Seo title="Your cart" description="Review your ShopKart cart, apply a coupon and check out." />
      <div className="container-x pb-8 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted tabular">{plural(summary.itemCount, 'item')}</p>
            <h1 className="mt-2 font-display text-5xl sm:text-6xl">Your <em className="italic text-accent">haul</em>.</h1>
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={o => { if (!clearing) setConfirmOpen(o) }}>
            <AlertDialogTrigger className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-[color,background-color,border-color,transform] hover:bg-surface-2 hover:text-danger active:scale-[0.98]">
              <Trash2 className="h-4 w-4" aria-hidden="true" />Clear cart
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[20px] border-line bg-surface p-7 shadow-[var(--shadow-lift)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl font-normal">Clear your cart?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted">
                  This removes {summary.itemCount === 1 ? 'your 1 item' : `all ${summary.itemCount} items`}{coupon.code ? ` and the ${coupon.code} coupon` : ''}. There’s no undo for this one.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-2">
                {/* Radix primitives directly: shadcn's Action/Cancel wrap Button via Slot, which concatenates (not merges) classes. */}
                <AlertDialogPrimitive.Cancel
                  disabled={clearing}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold transition-[color,background-color,border-color,transform] hover:border-ink disabled:opacity-50 active:scale-[0.98]"
                >
                  Keep my things
                </AlertDialogPrimitive.Cancel>
                <AlertDialogPrimitive.Action
                  disabled={clearing}
                  onClick={e => { e.preventDefault(); void onClear() }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-danger px-5 text-sm font-semibold text-white transition-[opacity,transform] hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                >
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Clear cart
                </AlertDialogPrimitive.Action>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <section className="lg:col-span-8" aria-labelledby="cart-items-heading">
            <h2 id="cart-items-heading" className="sr-only">Items</h2>
            <div className="hidden grid-cols-[1fr_7.5rem_6rem_2.25rem] gap-x-4 border-b border-line pb-3 pl-[116px] text-xs font-medium uppercase tracking-[0.14em] text-muted sm:grid">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {blocked ? (
              <p role="alert" className="mt-4 rounded-[12px] bg-danger/8 px-4 py-3 text-sm text-danger">
                {issues === 1 ? 'One item needs' : `${issues} items need`} your attention before checkout. Fix or remove {issues === 1 ? 'it' : 'them'} below.
              </p>
            ) : null}
            <ul className="divide-y divide-line">
              {items.map(item => <CartLine key={item.product._id} item={item} variant="page" />)}
            </ul>
            <div className="border-t border-line pt-6">
              <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />Keep shopping
              </Link>
            </div>
          </section>

          <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start" aria-label="Order summary">
            <div className="surface space-y-6 p-5 sm:p-6">
              <FreeShippingBar summary={summary} />
              <div className="h-px bg-line" />
              <CouponInput coupon={coupon.code} couponError={cart.couponError} onApply={onApply} onRemove={onRemoveCoupon} hint={couponHint} />
              <CartSummary summary={summary} coupon={coupon.valid ? coupon.code : null} />
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  disabled={blocked}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-accent-ink shadow-[0_10px_24px_-12px_var(--accent)] transition-[filter,opacity,transform] hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none active:scale-[0.98]"
                >
                  Proceed to checkout <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                {blocked ? <p className="mt-2 text-center text-xs text-danger">Fix the highlighted {issues === 1 ? 'item' : 'items'} to continue.</p> : null}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                  <Lock className="h-3 w-3" aria-hidden="true" />Secure payment via Razorpay · UPI, cards, netbanking
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

function CartSkeleton() {
  return (
    <div className="container-x pb-8 pt-10 sm:pt-14" aria-busy="true" aria-label="Loading cart">
      <Shimmer className="h-3 w-16 rounded-full" />
      <Shimmer className="mt-3 h-14 w-64 rounded-2xl" />
      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="divide-y divide-line lg:col-span-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex gap-5 py-6">
              <Shimmer className="aspect-[4/5] w-24 rounded-[10px]" />
              <div className="flex-1 space-y-2 pt-1">
                <Shimmer className="h-4 w-1/2 rounded-full" />
                <Shimmer className="h-3 w-1/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <Shimmer className="h-96 rounded-[var(--radius)] lg:col-span-4" />
      </div>
    </div>
  )
}
