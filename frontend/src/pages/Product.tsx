import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BellRing, Check, ChevronRight, PackageX, RotateCcw, Truck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/shared/Seo'
import { Price } from '@/components/shared/Price'
import { TickingQtyStepper } from '@/components/product/TickingQtyStepper'
import { Shimmer } from '@/components/product/Shimmer'
import { HeartButton } from '@/components/wishlist/HeartButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Gallery } from '@/components/product/Gallery'
import { ColorPicker } from '@/components/product/ColorPicker'
import { RatingStars } from '@/components/product/RatingStars'
import { StockBadge } from '@/components/product/StockBadge'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { ProductGrid } from '@/components/product/ProductGrid'
import { categoryCopy } from '@/components/shop/categories'
import { useProduct } from '@/hooks/useProducts'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { money } from '@/lib/format'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Badge, Product } from '@/types'

const MAX_QTY = 10
const BADGE_LABEL: Record<Badge, string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited run' }

/* ---------- "Why you'll love it": derived from tags, topped up with facts we know are true ---------- */

type Reason = { title: string; body: string }
const TAG_REASONS: Record<string, Reason> = {
  holographic: { title: 'Holographic shine', body: 'Catches the light every single time you open your laptop.' },
  waterproof: { title: 'Rain-proof, coffee-proof', body: 'Waterproof vinyl that survives spills, bottles and the odd wash.' },
  laptop: { title: 'Laptop-lid ready', body: 'Sized for lids, bottles and phone cases. Peels off when you redecorate.' },
  matte: { title: 'Writable matte finish', body: 'No glare in photos, and you can doodle right over it.' },
  journaling: { title: 'Journal-friendly', body: 'Made for planners, bullet journals and margins that need a little life.' },
  pastel: { title: 'Soft, easy colours', body: 'Pastel tones that play nicely together on any page.' },
  retro: { title: 'Retro, minus the dust', body: 'A throwback look that still feels fresh on today’s gear.' },
  enamel: { title: 'Proper enamel', body: 'A pin with real weight, clean lines and a secure clasp on the back.' },
  gift: { title: 'A tiny, perfect gift', body: 'Small enough for a card, good enough to be the whole present.' },
  desi: { title: 'Desi at heart', body: 'A little piece of home for your desk, bag or lapel.' },
  funny: { title: 'Instant desk laugh', body: 'Guaranteed to get a reaction in your next meeting.' },
  office: { title: 'Office approved', body: 'Useful enough for work, fun enough that you’ll actually use it.' },
  planning: { title: 'For serious planners', body: 'Plans, reminders and to-do lists, all within arm’s reach.' },
  planner: { title: 'For serious planners', body: 'Plans, reminders and to-do lists, all within arm’s reach.' },
  gel: { title: 'Smooth gel ink', body: 'Glides without skipping, so your notes look as good as they read.' },
  writing: { title: 'Made for writing', body: 'Comfortable for long lists, short notes and everything between.' },
  'dot grid': { title: 'Dot grid pages', body: 'Structure when you want it, freedom when you don’t.' },
  notebook: { title: 'Pocket-sized notebook', body: 'Fits a back pocket, holds a surprising number of ideas.' },
  highlighters: { title: 'Highlight-worthy', body: 'Bright tips that make the important bits impossible to miss.' },
  neon: { title: 'Properly neon', body: 'Bright enough to make even revision notes look exciting.' },
  minimal: { title: 'Quietly beautiful', body: 'Minimal design that looks good on any desk.' },
  brass: { title: 'Warm brass', body: 'A finish that ages gracefully and feels nicer than plastic.' },
  plants: { title: 'For plant parents', body: 'All of the green, none of the watering schedule.' },
  felt: { title: 'Soft felt', body: 'Handmade-feel felt that adds warmth to a desk.' },
  decor: { title: 'Tiny decor', body: 'The smallest possible upgrade to the space you look at all day.' },
  grip: { title: 'Secure grip', body: 'Holds your phone steady when you’re using it one-handed.' },
  stand: { title: 'Doubles as a stand', body: 'Pop it open for video calls and hands-free recipes.' },
  privacy: { title: 'Instant privacy', body: 'Slides shut over your webcam in one tiny motion.' },
  webcam: { title: 'Fits most webcams', body: 'Thin enough to keep your laptop lid closing flat.' },
  cables: { title: 'Kind to cables', body: 'Saves chargers from fraying right where they bend.' },
  organisation: { title: 'Cable calm', body: 'Turns cable spaghetti into something tidy.' },
  'desk setup': { title: 'Desk-setup upgrade', body: 'The small fix that makes your setup look intentional.' },
  candy: { title: 'Desk candy', body: 'The 4pm pick-me-up you keep in the top drawer.' },
  sour: { title: 'Pucker-level sour', body: 'Sour first, sweet after. Exactly as it should be.' },
  tangy: { title: 'Tangy and bright', body: 'A flavour that wakes up a sleepy afternoon.' },
  chocolate: { title: 'Real chocolate', body: 'A little treat that feels like a reward.' },
  mints: { title: 'Pocket-fresh', body: 'Fits any pocket. Freshens any meeting.' },
  music: { title: 'For the mixtape crowd', body: 'A nod to rewinding tapes with a pencil.' },
  stamp: { title: 'One stamp, endless approvals', body: 'Make sign-offs official. And a little funny.' },
  travel: { title: 'Born to wander', body: 'For backpacks, jackets and people who love window seats.' },
}

function loveReasons(p: Product): Reason[] {
  const out: Reason[] = []
  for (const tag of p.tags) {
    const r = TAG_REASONS[tag.toLowerCase()]
    if (r && !out.some(o => o.title === r.title)) out.push(r)
    if (out.length === 3) return out
  }
  const fallbacks: Reason[] = [
    ...(p.rating >= 4.5 && p.reviewCount >= 20 ? [{ title: `Rated ${p.rating.toFixed(1)} by ${p.reviewCount.toLocaleString('en-IN')} people`, body: 'Shoppers who don’t hand out stars lightly keep coming back for this one.' }] : []),
    { title: 'Honestly priced', body: `At ${money(p.price)}, it’s an easy yes. Or a very good little gift.` },
    { title: 'Ships in a day', body: `Packed and dispatched within 24 hours, with free shipping over ${money(FREE_SHIPPING_THRESHOLD)}.` },
  ]
  for (const f of fallbacks) { if (out.length < 3) out.push(f) }
  return out
}

/* ---------- page ---------- */

export default function ProductPage() {
  const { slug } = useParams()
  const state = useProduct(slug)

  if (state.status === 'loading') return <ProductSkeleton />
  if (state.status === 'notfound') {
    return (
      <div className="container-x py-16 sm:py-24">
        <Seo title="Product not found" />
        <EmptyState
          icon={<PackageX className="h-6 w-6" aria-hidden="true" />}
          title="This one wandered off"
          description="We couldn’t find that product. It may have sold out for good, or the link has a typo."
          action={<Link to="/shop" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-bg transition-transform active:scale-[0.98]">Browse the shop <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
      </div>
    )
  }
  if (state.status === 'error' || !state.product) {
    return (
      <div className="container-x py-16">
        <Seo title="Something went wrong" />
        <ErrorState message={state.error ?? 'We couldn’t load this product.'} onRetry={state.retry} />
        <p className="mt-6 text-center text-sm"><Link to="/shop" className="font-medium underline underline-offset-4">Back to the shop</Link></p>
      </div>
    )
  }
  return <ProductDetail key={state.product._id} product={state.product} related={state.related} />
}

function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const colors = product.colors ?? []
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0].name : null)
  const [qty, setQty] = useState(1)
  const [shake, setShake] = useState(0)
  const [hint, setHint] = useState(false)
  const [notified, setNotified] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const [ctaPassed, setCtaPassed] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const reduce = useReducedMotion()

  const soldOut = product.stock <= 0
  const maxQty = Math.max(1, Math.min(MAX_QTY, product.stock))
  const cat = categoryCopy(product.category)
  const reasons = loveReasons(product)
  const paragraphs = product.description.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
  const lineTotal = product.price * qty

  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    // Only once the main CTA has scrolled *above* the viewport (not while it's still below the fold).
    const io = new IntersectionObserver(([entry]) => setCtaPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  function missingColor() {
    setHint(true)
    setShake(n => n + 1)
    colorRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  }

  function pickColor(name: string) { setColor(name); setHint(false) }

  function notify() {
    setNotified(true)
    toast.success('We’ll let you know', { description: `You’ll hear from us when ${product.name} is back.` })
  }

  const showStickyBar = !isDesktop && ctaPassed && !soldOut

  // Let bottom-anchored UI (the "Added to cart" card) sit above the sticky bar while it's showing.
  useEffect(() => {
    if (!showStickyBar) return
    document.documentElement.style.setProperty('--sk-bottom-bar', '76px')
    return () => { document.documentElement.style.removeProperty('--sk-bottom-bar') }
  }, [showStickyBar])

  return (
    <>
      <Seo title={product.name} description={`${product.tagline} ${money(product.price)} at ShopKart. ${product.description.slice(0, 110)}`} />

      <div className="container-x pt-5 sm:pt-8" data-fly-scope>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <li><Link to="/shop" className="transition-colors hover:text-ink">Shop</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li><Link to={`/shop?category=${product.category}`} className="transition-colors hover:text-ink">{cat?.label ?? product.category}</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li aria-current="page" className="max-w-[16rem] truncate text-ink">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-14">
          <Gallery images={product.images} alt={product.name} className="lg:col-span-7" />

          <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            {product.badges.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {product.badges.map(b => (
                  <span key={b} className={cn('rounded-full px-3 py-1 text-xs font-semibold', b === 'bestseller' ? 'bg-accent/10 text-accent' : b === 'new' ? 'bg-accent-2/10 text-accent-2' : 'bg-warning/10 text-warning')}>
                    {BADGE_LABEL[b]}
                  </span>
                ))}
              </div>
            ) : null}

            <h1 className="text-balance font-display text-4xl leading-[1.04] sm:text-5xl">{product.name}</h1>
            <p className="mt-3 font-display text-xl italic text-muted">{product.tagline}</p>

            <a href="#details" className="mt-4 inline-flex rounded-full transition-opacity hover:opacity-80">
              <RatingStars rating={product.rating} count={product.reviewCount} />
            </a>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Price price={product.price} compareAtPrice={product.compareAtPrice} size="xl" />
              <span className="text-xs text-muted">incl. of all taxes</span>
            </div>

            <div className="my-7 h-px bg-line" />

            {colors.length ? (
              <div ref={colorRef} className="mb-7 scroll-mt-28">
                <ColorPicker colors={colors} value={color} onChange={pickColor} shake={shake} showHint={hint} />
              </div>
            ) : null}

            <div ref={ctaRef} className="flex items-center gap-3">
              <TickingQtyStepper value={qty} max={maxQty} onChange={n => setQty(Math.max(1, Math.min(maxQty, n)))} disabled={soldOut} />
              <AddToCartButton product={product} qty={qty} color={color} requireColor={colors.length > 0} onMissingColor={missingColor} className="min-w-0 flex-1" />
              <HeartButton product={product} variant="pill" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <StockBadge stock={product.stock} />
              {!soldOut && qty === maxQty && maxQty === MAX_QTY ? <span className="text-xs text-muted">Max {MAX_QTY} per order</span> : null}
            </div>

            {soldOut ? (
              <button
                type="button"
                onClick={notify}
                disabled={notified}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink text-sm font-semibold transition-[color,background-color,border-color,transform] hover:bg-ink hover:text-bg disabled:border-line disabled:text-muted disabled:hover:bg-transparent active:scale-[0.98]"
              >
                {notified ? <><Check className="h-4 w-4" aria-hidden="true" />We’ll let you know</> : <><BellRing className="h-4 w-4" aria-hidden="true" />Notify me when it’s back</>}
              </button>
            ) : null}

            <ul className="mt-8 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface text-sm">
              <li className="flex gap-3.5 p-4">
                <Truck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" aria-hidden="true" />
                <div>
                  <p className="font-medium">Free shipping over {money(FREE_SHIPPING_THRESHOLD)}</p>
                  <p className="mt-0.5 text-muted">{lineTotal >= FREE_SHIPPING_THRESHOLD ? 'This one qualifies on its own. Nice.' : `Otherwise a flat ${money(SHIPPING_FEE)}. A couple more tiny things gets you there.`}</p>
                </div>
              </li>
              <li className="flex gap-3.5 p-4">
                <Zap className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" aria-hidden="true" />
                <div>
                  <p className="font-medium">Ships within 24 hours</p>
                  <p className="mt-0.5 text-muted">Order today and it’s on its way by tomorrow.</p>
                </div>
              </li>
              <li className="flex gap-3.5 p-4">
                <RotateCcw className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" aria-hidden="true" />
                <div>
                  <p className="font-medium">7-day easy returns</p>
                  <p className="mt-0.5 text-muted">Changed your mind? Send it back within a week.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <section id="details" className="mt-20 grid scroll-mt-24 gap-12 border-t border-line pt-14 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <h2 className="font-display text-3xl sm:text-4xl">The <em className="italic">details</em></h2>
            <div className="mt-5 max-w-prose space-y-4 text-pretty text-[17px] leading-relaxed text-ink/85">
              {paragraphs.map((para, i) => <p key={i}>{para}</p>)}
            </div>
            {product.tags.length ? (
              <ul className="mt-7 flex flex-wrap gap-2" aria-label="Tags">
                {product.tags.map(t => (
                  <li key={t}>
                    <Link to={`/shop?q=${encodeURIComponent(t)}`} className="inline-flex h-8 items-center rounded-full border border-line px-3 text-xs font-medium text-muted transition-colors hover:border-ink hover:text-ink">
                      #{t}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl sm:text-4xl">Why you’ll <em className="italic text-accent">love</em> it</h2>
            <ol className="mt-6 space-y-5">
              {reasons.map((r, i) => (
                <li key={r.title} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line font-display text-sm italic tabular">{i + 1}</span>
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{r.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {related.length ? (
          <section className="mt-24" aria-labelledby="related-heading">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 id="related-heading" className="font-display text-3xl sm:text-4xl">You might also <em className="italic">like</em></h2>
              <Link to={`/shop?category=${product.category}`} className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink sm:inline-flex">
                More {cat?.label.toLowerCase() ?? 'like this'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ProductGrid products={related.slice(0, 4)} />
          </section>
        ) : null}
        {/* Room for the mobile sticky add bar so it never hides the footer. */}
        {!soldOut ? <div className="h-20 lg:hidden" aria-hidden="true" /> : null}
      </div>

      <AnimatePresence>
        {showStickyBar ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: '110%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '110%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-sm tabular text-muted">{color ? `${color} · ` : ''}{money(product.price)}</p>
              </div>
              <AddToCartButton product={product} qty={qty} color={color} requireColor={colors.length > 0} onMissingColor={missingColor} className="h-11 w-auto px-5 text-sm" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function ProductSkeleton() {
  return (
    <div className="container-x pt-5 sm:pt-8" aria-busy="true" aria-label="Loading product">
      <Shimmer className="h-4 w-48 rounded-full" />
      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-14">
        <div className="flex flex-col gap-3 lg:col-span-7 lg:flex-row-reverse lg:gap-4">
          <Shimmer className="aspect-[4/5] flex-1 rounded-[var(--radius)]" />
          <div className="flex gap-2 lg:w-20 lg:flex-col">
            {[0, 1].map(i => <Shimmer key={i} className="aspect-[4/5] w-16 rounded-[10px] lg:w-full" />)}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Shimmer className="h-12 w-4/5 rounded-2xl" />
          <Shimmer className="h-6 w-1/2 rounded-full" />
          <Shimmer className="h-4 w-32 rounded-full" />
          <Shimmer className="h-9 w-28 rounded-full" />
          <div className="!mt-10 flex gap-3">
            <Shimmer className="h-11 w-28 rounded-full" />
            <Shimmer className="h-12 flex-1 rounded-full" />
          </div>
          <Shimmer className="!mt-8 h-48 rounded-[var(--radius)]" />
        </div>
      </div>
    </div>
  )
}
