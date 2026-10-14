import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Heart } from 'lucide-react'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { Shimmer } from '@/components/product/Shimmer'
import { WishlistCard } from '@/components/wishlist/WishlistCard'
import { useWishlist } from '@/store/wishlist'
import { useAuth } from '@/store/auth'
import { plural } from '@/lib/format'

export default function Wishlist() {
  const items = useWishlist(s => s.items)
  const loaded = useWishlist(s => s.loaded)
  const user = useAuth(s => s.user)
  const authReady = useAuth(s => s.status) === 'ready'
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  return (
    <div className="container-x pb-8 pt-10 sm:pt-14">
      <Seo title="Wishlist" description="Things you’ve saved for later at ShopKart." />
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted tabular">
        Wishlist{loaded && items.length ? ` · ${plural(items.length, 'item')}` : ''}
      </p>
      <h1 className="mt-2 font-display text-5xl sm:text-6xl">Saved for <em className="italic text-accent">later</em>.</h1>
      {authReady && !user && items.length > 0 ? (
        <p className="mt-4 max-w-xl text-sm text-muted">
          Saved on this device.{' '}
          <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="font-medium text-ink underline underline-offset-4 hover:no-underline">Log in</Link>
          {' '}to keep them with your account.
        </p>
      ) : null}

      <div className="mt-10">
        {!loaded ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6" aria-busy="true" aria-label="Loading wishlist">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Shimmer className="aspect-[4/5] rounded-[var(--radius)]" />
                <Shimmer className="mt-4 h-4 w-3/4 rounded-full" />
                <Shimmer className="mt-4 h-11 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-6 w-6" aria-hidden="true" />}
            title="Nothing saved yet"
            description="Tap the heart on anything you like and we’ll keep it here for later. No pressure."
            action={
              <Link to="/shop" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]">
                Browse the shop <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14">
            {items.map((p, i) => (
              <motion.li
                key={p._id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : Math.min(i, 8) * 0.04 }}
                className="flex"
              >
                <div className="w-full"><WishlistCard product={p} /></div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
