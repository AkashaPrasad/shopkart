import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Heart, LogOut, MapPin, Moon, Package, Sun, User as UserIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'
import { SlideOver, SlideOverClose } from '@/components/cart/SlideOver'
import { CATEGORY_LIST } from '@/components/shop/categories'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { useWishlist } from '@/store/wishlist'
import { Shimmer } from '@/components/product/Shimmer'
import { cn } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD, PRICE_PRESETS } from '@/lib/constants'
import { money } from '@/lib/format'

const EASE = [0.22, 1, 0.36, 1] as const
const iconBtn = 'relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2'

/* ---------- small pieces shared with the Header ---------- */

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme(s => s.theme)
  const toggle = useTheme(s => s.toggle)
  const reduce = useReducedMotion()
  const dark = theme === 'dark'
  return (
    <button type="button" onClick={toggle} className={cn(iconBtn, 'overflow-hidden', className)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="grid place-items-center"
        >
          {dark ? <Moon className="h-[18px] w-[18px]" aria-hidden="true" /> : <Sun className="h-[18px] w-[18px]" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '·'
}

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={cn('grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[12px] font-semibold tracking-wide text-bg', className)} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  )
}

/** Paths that require auth: after logging out we leave them before RequireAuth bounces to /login. */
const PROTECTED = ['/account', '/checkout', '/order']
const isProtected = (path: string) => PROTECTED.some(p => path.startsWith(p))

/**
 * Logs out. On a protected page we first navigate home and only clear the session once the route has
 * actually changed: router navigations run in a transition (lazy routes suspend), so clearing the user
 * immediately would let RequireAuth on the old page redirect to /login?next=… instead.
 */
export function useLogout() {
  const logout = useAuth(s => s.logout)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pending = useRef(false)

  const finish = useCallback(async () => {
    await logout()
    toast('Logged out. Your tiny things will wait for you.')
  }, [logout])

  useEffect(() => {
    if (pending.current && !isProtected(pathname)) { pending.current = false; void finish() }
  }, [pathname, finish])

  return async () => {
    if (isProtected(pathname)) { pending.current = true; navigate('/', { replace: true }); return }
    await finish()
  }
}

export function loginHref(pathname: string, search: string) {
  if (['/', '/login', '/register'].includes(pathname)) return '/login'
  return `/login?next=${encodeURIComponent(pathname + search)}`
}

/* ---------- mobile navigation sheet ---------- */

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const user = useAuth(s => s.user)
  const status = useAuth(s => s.status)
  const theme = useTheme(s => s.theme)
  const toggleTheme = useTheme(s => s.toggle)
  const { pathname, search } = useLocation()
  const doLogout = useLogout()
  const reduce = useReducedMotion()
  const saved = useWishlist(s => s.items.length)
  const close = () => onOpenChange(false)

  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4, ease: EASE, delay: reduce ? 0 : 0.08 + i * 0.035 },
  } as const)

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} side="left" title="Menu">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
        <Link to="/" onClick={close} aria-label="ShopKart home"><Logo /></Link>
        <SlideOverClose className={cn(iconBtn, '-mr-2')} aria-label="Close menu">
          <X className="h-5 w-5" aria-hidden="true" />
        </SlideOverClose>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mobile">
        <motion.div {...item(0)}>
          <Link to="/shop" onClick={close} className="group flex items-baseline justify-between">
            <span className="font-display text-[34px] leading-none">Shop <em className="italic">everything</em></span>
            <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </motion.div>

        <p className="mt-8 text-xs font-medium uppercase tracking-[0.14em] text-muted">Categories</p>
        <ul className="mt-2 divide-y divide-line">
          {CATEGORY_LIST.map((c, i) => (
            <motion.li key={c.key} {...item(i + 1)}>
              <Link to={`/shop?category=${c.key}`} onClick={close} className="flex items-center gap-3 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2"><c.icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <span className="block font-medium">{c.label}</span>
                  <span className="block truncate text-xs text-muted">{c.blurb}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
        <motion.div {...item(CATEGORY_LIST.length + 1)} className="mt-4 flex flex-wrap gap-2">
          <Link to={`/shop?maxPrice=${PRICE_PRESETS[0].max}`} onClick={close} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition-transform active:scale-[0.98]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />{PRICE_PRESETS[0].label}
          </Link>
          <Link to="/wishlist" onClick={close} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition-transform active:scale-[0.98]">
            <Heart className="h-4 w-4" aria-hidden="true" />Wishlist
            {saved ? <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold leading-none text-bg tabular">{saved}</span> : null}
          </Link>
        </motion.div>
      </nav>

      <div className="shrink-0 space-y-4 border-t border-line bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        {status !== 'ready' ? (
          <Shimmer className="h-11 rounded-full" />
        ) : user ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatarUrl} className="h-10 w-10" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
              {[
                { to: '/account', label: 'Account', Icon: UserIcon },
                { to: '/account/orders', label: 'Orders', Icon: Package },
                { to: '/account/addresses', label: 'Addresses', Icon: MapPin },
              ].map(({ to, label, Icon }) => (
                <Link key={to} to={to} onClick={close} className="flex flex-col items-center gap-1.5 rounded-[12px] border border-line py-3 transition-colors hover:border-ink">
                  <Icon className="h-4 w-4" aria-hidden="true" />{label}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link to={loginHref(pathname, search)} onClick={close} className="inline-flex h-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-bg transition-transform active:scale-[0.98]">Log in</Link>
            <Link to="/register" onClick={close} className="inline-flex h-11 items-center justify-center rounded-full border border-line text-sm font-semibold transition-transform active:scale-[0.98]">Create account</Link>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button type="button" onClick={toggleTheme} className="inline-flex h-10 items-center gap-2.5 rounded-full text-sm font-medium transition-transform active:scale-[0.98]" aria-pressed={theme === 'dark'}>
            <span className={cn('relative h-6 w-10 rounded-full transition-colors', theme === 'dark' ? 'bg-accent' : 'bg-line')} aria-hidden="true">
              <span className={cn('absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-surface shadow transition-[left] duration-200', theme === 'dark' ? 'left-[18px]' : 'left-0.5')}>
                {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              </span>
            </span>
            Dark mode
          </button>
          {user ? (
            <button type="button" onClick={() => { close(); void doLogout() }} className="inline-flex h-10 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
              <LogOut className="h-4 w-4" aria-hidden="true" />Log out
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted">Small objects. Honest prices. · Free shipping over {money(FREE_SHIPPING_THRESHOLD)}</p>
      </div>
    </SlideOver>
  )
}
