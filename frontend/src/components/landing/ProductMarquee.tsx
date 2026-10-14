import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/store/cart'
import type { Product } from '@/types'
import { useFeatured } from './data'
import { ArrowRightIcon, PlusIcon } from './icons'
import { ProductThumb, SectionHeading } from './shared'

/** Every row needs at least this many tiles per copy so the loop never shows a gap on wide screens. */
const MIN_TILES_PER_COPY = 12
const SECONDS_PER_TILE = 4.2
const TILE_W = 'w-[156px] sm:w-[208px]'

function AddButton({ product, focusable }: { product: Product; focusable: boolean }) {
  const add = useCart(s => s.add)
  const openDrawer = useCart(s => s.openDrawer)
  const pending = useCart(s => !!s.pending[product._id])
  const soldOut = product.stock <= 0

  async function onAdd() {
    try {
      await add(product)
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t add that to your cart.'))
    }
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      tabIndex={focusable ? undefined : -1}
      disabled={soldOut || pending}
      aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
      title={soldOut ? 'Sold out' : 'Add to cart'}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-bg shadow-[var(--shadow-soft)] ring-2 ring-surface transition-[background-color,color,transform] duration-200 hover:bg-accent hover:text-accent-ink active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {pending ? (
        <span className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
      ) : (
        <PlusIcon size={18} />
      )}
    </button>
  )
}

function Tile({ product, focusable = true }: { product: Product; focusable?: boolean }) {
  return (
    <li className={cn(TILE_W, 'shrink-0')} aria-hidden={focusable ? undefined : true}>
      <div className="group/tile relative rounded-[14px] border border-line bg-surface p-2 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
        <Link to={`/product/${product.slug}`} tabIndex={focusable ? undefined : -1} className="block rounded-[10px]">
          <ProductThumb
            src={product.images[0]}
            alt={product.name}
            category={product.category}
            sizes="208px"
            eager
            className="aspect-square rounded-[10px] [&_img]:transition-transform [&_img]:duration-500 group-hover/tile:[&_img]:scale-[1.04]"
          />
          <span className="block px-1 pt-2.5 pb-0.5">
            <span className="block truncate text-sm leading-5 font-medium">{product.name}</span>
            <span className="tabular block text-sm leading-5">
              <span className="font-semibold">{money(product.price)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.price ? (
                <span className="ml-1.5 text-xs text-muted line-through">{money(product.compareAtPrice)}</span>
              ) : null}
            </span>
          </span>
        </Link>
        <div className="absolute right-4 bottom-[4.25rem]">
          <AddButton product={product} focusable={focusable} />
        </div>
      </div>
    </li>
  )
}

function SkeletonTile() {
  return (
    <li className={cn(TILE_W, 'shrink-0')} aria-hidden="true">
      <div className="rounded-[14px] border border-line bg-surface p-2">
        <div className="aspect-square animate-pulse rounded-[10px] bg-surface-2" />
        <div className="space-y-1.5 px-1 pt-3 pb-1.5">
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface-2" />
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
    </li>
  )
}

function MarqueeRow({ items, reverse = false }: { items: Product[]; reverse?: boolean }) {
  const reduce = useReducedMotion()
  const copy = useMemo(() => {
    const repeats = Math.max(1, Math.ceil(MIN_TILES_PER_COPY / items.length))
    return Array.from({ length: repeats }, () => items).flat()
  }, [items])

  if (reduce) {
    return (
      <div className="no-scrollbar snap-x overflow-x-auto px-4 sm:px-6 lg:px-[max(2rem,calc((100%-1280px)/2+2rem))]">
        <ul className="flex w-max gap-3 py-2 sm:gap-4">
          {items.map(p => <Tile key={p._id} product={p} />)}
        </ul>
      </div>
    )
  }

  return (
    <div className="group/row relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
      <div
        className="flex w-max [animation:sk-marquee_var(--sk-dur)_linear_infinite] group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused]"
        style={{ '--sk-dur': `${copy.length * SECONDS_PER_TILE}s`, animationDirection: reverse ? 'reverse' : 'normal' } as React.CSSProperties}
      >
        <ul className="flex gap-3 pr-3 sm:gap-4 sm:pr-4">
          {copy.map((p, i) => <Tile key={`${p._id}-${i}`} product={p} focusable={i < items.length} />)}
        </ul>
        {/* Second copy makes the loop seamless; hidden from assistive tech and the tab order, still clickable. */}
        <ul className="flex gap-3 pr-3 sm:gap-4 sm:pr-4" aria-hidden="true">
          {copy.map((p, i) => <Tile key={`${p._id}-dup-${i}`} product={p} focusable={false} />)}
        </ul>
      </div>
    </div>
  )
}

function SkeletonRows({ dim = false }: { dim?: boolean }) {
  return (
    <div className={cn('space-y-3 overflow-hidden sm:space-y-4', dim && 'opacity-50')}>
      {[0, 1].map(row => (
        <ul key={row} className={cn('flex w-max gap-3 py-2 sm:gap-4', row === 1 ? '-ml-20' : 'ml-4 sm:ml-6 lg:ml-8')}>
          {Array.from({ length: 10 }, (_, i) => <SkeletonTile key={i} />)}
        </ul>
      ))}
    </div>
  )
}

export function ProductMarquee() {
  const featured = useFeatured()
  const items = featured.items
  const rowB = useMemo(() => {
    const half = Math.ceil(items.length / 2)
    return [...items.slice(half), ...items.slice(0, half)].reverse()
  }, [items])

  return (
    <section aria-labelledby="fresh-heading" className="py-16 sm:py-24">
      <div className="container-x mb-8 flex items-end justify-between gap-6 sm:mb-10">
        <SectionHeading
          eyebrow="Featured"
          title={
            <span id="fresh-heading">
              Fresh off the <em className="text-accent">shelf</em>
            </span>
          }
        />
        <Link
          to="/shop"
          className="group mb-1 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          See all
          <ArrowRightIcon size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {featured.status === 'loading' ? (
        <div role="status" aria-label="Loading featured products">
          <SkeletonRows />
        </div>
      ) : featured.status === 'error' ? (
        <div className="relative">
          <SkeletonRows dim />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-surface px-6 py-5 text-center shadow-[var(--shadow-lift)] sm:flex-row sm:gap-4 sm:text-left">
              <p className="text-sm">
                <span className="font-medium">Couldn’t reach the shelves.</span>{' '}
                <span className="text-muted">Check your connection and try again.</span>
              </p>
              <button
                type="button"
                onClick={featured.retry}
                className="inline-flex h-10 shrink-0 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-accent-ink"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="container-x">
          <div className="rounded-[14px] border border-dashed border-line px-6 py-12 text-center">
            <p className="font-display text-2xl">The shelves are being restocked.</p>
            <p className="mt-2 text-sm text-muted">New tiny things land soon. The full catalog is one click away.</p>
            <Link to="/shop" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">
              Browse the shop
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <MarqueeRow items={items} />
          <MarqueeRow items={rowB} reverse />
        </div>
      )}
    </section>
  )
}
