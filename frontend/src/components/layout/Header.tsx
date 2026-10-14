import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { ArrowRight, ChevronDown, Heart, LayoutDashboard, LogOut, MapPin, Menu, Package, Search, ShoppingBag, User as UserIcon } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SlideOver } from '@/components/cart/SlideOver'
import { SearchBox } from '@/components/shop/SearchBox'
import { CATEGORY_LIST } from '@/components/shop/categories'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'
import { useWishlist } from '@/store/wishlist'
import { CART_BUMP_EVENT, isFlyingToCart } from '@/components/shared/FlyToCart'
import { Shimmer } from '@/components/product/Shimmer'
import { cn } from '@/lib/utils'
import { PRICE_PRESETS } from '@/lib/constants'
import { Avatar, loginHref, MobileNav, ThemeToggle, useLogout } from './MobileNav'

const EASE = [0.22, 1, 0.36, 1] as const
const iconBtn = 'relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2'
const navItem = 'inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-sm font-medium text-ink/75 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink'
const menuItem = 'cursor-pointer rounded-[10px] px-3 py-2.5 text-sm focus:bg-surface-2 focus:text-ink'

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname, search } = useLocation()
  const user = useAuth(s => s.user)
  const authStatus = useAuth(s => s.status)
  const syncWishlist = useWishlist(s => s.sync)

  // Wishlist follows auth (guest list merges into the account on login). The store skips repeat syncs.
  useEffect(() => { if (authStatus === 'ready') void syncWishlist(user?._id ?? null) }, [authStatus, user?._id, syncWishlist])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close overlays when the route changes (adjusting state during render, not in an effect).
  const [route, setRoute] = useState(pathname + search)
  if (route !== pathname + search) { setRoute(pathname + search); setNavOpen(false); setSearchOpen(false) }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled ? 'border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-bg',
      )}
    >
      <a
        href="#main"
        onClick={e => {
          const main = document.querySelector('main')
          if (!main) return
          e.preventDefault()
          main.setAttribute('tabindex', '-1')
          main.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-bg">
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center gap-1">
        <button type="button" className={cn(iconBtn, '-ml-2 lg:hidden')} onClick={() => setNavOpen(true)} aria-label="Open menu" aria-expanded={navOpen}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Link to="/" className="mr-2 rounded-lg" aria-label="ShopKart home">
          <Logo />
        </Link>

        <nav className="ml-6 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          <NavLink to="/shop" end className={({ isActive }) => cn(navItem, isActive && !search && 'bg-surface-2 text-ink')}>
            Shop
          </NavLink>
          <CategoriesMenu />
          <Link to={`/shop?maxPrice=${PRICE_PRESETS[0].max}`} className={navItem}>
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {PRICE_PRESETS[0].label}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <DesktopSearch />
          <button type="button" className={cn(iconBtn, 'md:hidden')} onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <ThemeToggle className="hidden lg:grid" />
          <WishlistLink />
          <AccountMenu />
          <CartButton />
        </div>
      </div>

      <MobileNav open={navOpen} onOpenChange={setNavOpen} />
      <MobileSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

function CategoriesMenu() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={cn(navItem, 'group outline-none focus-visible:ring-2 focus-visible:ring-accent')}>
        Categories <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={10} className="w-[560px] rounded-[18px] border-line bg-surface p-2 shadow-[var(--shadow-lift)]">
        <div className="grid grid-cols-2 gap-0.5">
          {CATEGORY_LIST.map(c => (
            <DropdownMenuItem key={c.key} asChild className="cursor-pointer items-start gap-3 rounded-[12px] p-3 focus:bg-surface-2 focus:text-ink">
              <Link to={`/shop?category=${c.key}`} className="group/cat">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink transition-colors group-data-[highlighted]/cat:bg-bg">
                  <c.icon className="h-4 w-4 text-ink" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{c.label}</span>
                  <span className="block text-xs text-muted">{c.blurb}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="mx-1 my-2 bg-line" />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <DropdownMenuItem asChild className={cn(menuItem, 'font-medium')}>
            <Link to="/shop">Shop everything <ArrowRight className="h-4 w-4 text-ink" aria-hidden="true" /></Link>
          </DropdownMenuItem>
          <p className="pr-3 text-xs text-muted">Small objects. Honest prices.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DesktopSearch() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  // Keep the field in sync when we're already looking at search results.
  const urlQ = pathname === '/shop' ? params.get('q') ?? '' : null
  const [syncedQ, setSyncedQ] = useState(urlQ)
  if (urlQ !== syncedQ) { setSyncedQ(urlQ); if (urlQ !== null) setText(urlQ) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = text.trim()
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
    inputRef.current?.blur()
    setOpen(false)
  }

  function openSearch() {
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <form role="search" onSubmit={submit} className="relative hidden h-10 items-center md:flex">
      <motion.div
        initial={false}
        animate={{ width: open ? 264 : 40 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
        className={cn('relative flex h-10 items-center overflow-hidden rounded-full border transition-colors', open ? 'border-line bg-surface' : 'border-transparent hover:bg-surface-2')}
      >
        <button
          type={open ? 'submit' : 'button'}
          onClick={open ? undefined : openSearch}
          aria-label={open ? 'Search' : 'Open search'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-transform active:scale-[0.98]"
          tabIndex={0}
        >
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <label htmlFor="header-search" className="sr-only">Search products</label>
        <input
          ref={inputRef}
          id="header-search"
          type="search"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => { if (!text.trim()) setOpen(false) }}
          onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.blur(); setOpen(false) } }}
          placeholder="Search tiny things…"
          tabIndex={open ? 0 : -1}
          autoComplete="off"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {open ? (
          <kbd className="mr-3 hidden rounded-md border border-line px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted xl:inline">esc</kbd>
        ) : null}
      </motion.div>
    </form>
  )
}

const SUGGESTIONS = ['washi tape', 'gel pen', 'enamel pin', 'keychain', 'stickers']

function MobileSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  function go(q: string) {
    onOpenChange(false)
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
  }
  return (
    <SlideOver open={open} onOpenChange={onOpenChange} side="top" title="Search" className="h-dvh border-b-0">
      <div className="flex items-center gap-2 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <SearchBox onSubmit={go} autoFocus size="lg" placeholder="Search tiny things…" className="flex-1" />
        <button type="button" onClick={() => onOpenChange(false)} className="h-11 shrink-0 rounded-full px-3 text-sm font-medium text-muted hover:text-ink transition-transform active:scale-[0.98]">
          Cancel
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">Try</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => go(s)} className="h-10 rounded-full border border-line px-4 text-sm transition-[color,background-color,border-color,transform] hover:border-ink active:scale-[0.98]">
              {s}
            </button>
          ))}
        </div>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.14em] text-muted">Browse</p>
        <ul className="mt-2 divide-y divide-line">
          {CATEGORY_LIST.map(c => (
            <li key={c.key}>
              <Link to={`/shop?category=${c.key}`} onClick={() => onOpenChange(false)} className="flex items-center gap-3 py-3.5">
                <c.icon className="h-4 w-4 text-muted" aria-hidden="true" />
                <span className="font-medium">{c.label}</span>
                <span className="ml-auto truncate text-sm text-muted">{c.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SlideOver>
  )
}

function AccountMenu() {
  const user = useAuth(s => s.user)
  const status = useAuth(s => s.status)
  const { pathname, search } = useLocation()
  const doLogout = useLogout()

  if (status !== 'ready') return <Shimmer className="mx-1 hidden h-8 w-8 rounded-full lg:block" />

  if (!user) {
    return (
      <Link
        to={loginHref(pathname, search)}
        className="ml-1 hidden h-9 items-center rounded-full border border-line px-4 text-sm font-medium transition-[color,background-color,border-color,transform] hover:border-ink lg:inline-flex active:scale-[0.98]"
      >
        Log in
      </Link>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="ml-1 hidden rounded-full p-1 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent lg:block" aria-label={`Account menu for ${user.name}`}>
        <Avatar name={user.name} src={user.avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-[16px] border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]">
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2.5 font-normal">
          <Avatar name={user.name} src={user.avatarUrl} className="h-9 w-9" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-muted">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 bg-line" />
        <DropdownMenuItem asChild className={menuItem}><Link to="/account"><UserIcon aria-hidden="true" />Account</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}><Link to="/account/orders"><Package aria-hidden="true" />Orders</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}><Link to="/wishlist"><Heart aria-hidden="true" />Wishlist</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}><Link to="/account/addresses"><MapPin aria-hidden="true" />Addresses</Link></DropdownMenuItem>
        {user.role === 'admin' ? (
          <DropdownMenuItem asChild className={menuItem}><Link to="/admin"><LayoutDashboard aria-hidden="true" />Admin console</Link></DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="mx-1 bg-line" />
        <DropdownMenuItem className={menuItem} onSelect={() => { void doLogout() }}>
          <LogOut aria-hidden="true" />Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WishlistLink() {
  const count = useWishlist(s => s.items.length)
  const reduce = useReducedMotion()
  return (
    <Link to="/wishlist" className={iconBtn} aria-label={count ? `Wishlist, ${count} saved` : 'Wishlist'}>
      <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
      {count > 0 ? (
        <motion.span
          key={count}
          initial={reduce ? { opacity: 0.4 } : { scale: 0.4, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 640, damping: 16 }}
          className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[10.5px] font-bold leading-none text-bg tabular ring-2 ring-bg"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      ) : null}
    </Link>
  )
}

/**
 * Cart button and fly-to-cart target. The badge bumps when a flying product lands (CART_BUMP_EVENT); for adds
 * without a flight (other tabs, merges, reduced motion) it bumps when the count goes up.
 */
function CartButton() {
  const count = useCart(s => s.cart.summary.itemCount)
  const loaded = useCart(s => s.loaded)
  const openDrawer = useCart(s => s.openDrawer)
  const reduce = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const [bump, setBump] = useState(0)
  const prev = useRef(count)
  const wasLoaded = useRef(loaded)
  const lastBump = useRef(0)

  useEffect(() => {
    const onBump = () => { lastBump.current = Date.now(); setBump(b => b + 1) }
    window.addEventListener(CART_BUMP_EVENT, onBump)
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump)
  }, [])

  useEffect(() => {
    // The first sync (0 -> n on page load) isn't an "add", so only count growth after the cart had loaded.
    const grew = count > prev.current && wasLoaded.current
    prev.current = count
    wasLoaded.current = loaded
    if (!grew) return
    // Give a just-started flight a moment to register; if one is on its way, it bumps on landing instead.
    const t = window.setTimeout(() => {
      if (!isFlyingToCart() && Date.now() - lastBump.current > 300) { lastBump.current = Date.now(); setBump(b => b + 1) }
    }, 60)
    return () => window.clearTimeout(t)
  }, [count, loaded])

  useEffect(() => {
    if (!bump || reduce || !scope.current) return
    animate(scope.current, { rotate: [0, -14, 10, -6, 0], y: [0, -2, 0] }, { duration: 0.55, ease: 'easeOut' })
  }, [bump, reduce, animate, scope])

  return (
    <button
      type="button"
      onClick={openDrawer}
      data-cart-target
      className={cn(iconBtn, '-mr-2 ml-0.5')}
      aria-label={count ? `Open cart, ${count} item${count === 1 ? '' : 's'}` : 'Open cart, empty'}
      aria-haspopup="dialog"
    >
      <span ref={scope} className="grid place-items-center">
        <ShoppingBag className="h-[19px] w-[19px]" aria-hidden="true" />
      </span>
      {count > 0 ? (
        <motion.span
          key={bump}
          initial={reduce ? { opacity: 0.4 } : { scale: 0.4, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 640, damping: 16 }}
          className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10.5px] font-bold leading-none text-accent-ink tabular ring-2 ring-bg"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      ) : null}
    </button>
  )
}
