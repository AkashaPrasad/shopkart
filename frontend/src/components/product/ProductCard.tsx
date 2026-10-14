import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Badge, ProductLite } from '@/types'
import { discountPct, money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ProductImage } from './ProductImage'
import { AddToCartButton } from './AddToCartButton'
import { LOW_STOCK } from './StockBadge'
import { HeartButton } from '@/components/wishlist/HeartButton'

const BADGE_LABEL: Record<Badge, string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' }
const BADGE_DOT: Record<Badge, string> = { new: 'bg-accent-2', bestseller: 'bg-accent', limited: 'bg-warning' }

export function ProductCard({ product, eager = false, className }: { product: ProductLite; eager?: boolean; className?: string }) {
  const { slug, name, tagline, images, price, compareAtPrice, stock, badges, colors } = product
  const [color, setColor] = useState<string | null>(colors?.[0]?.name ?? null)
  const pct = discountPct(price, compareAtPrice)
  const soldOut = stock <= 0
  const low = !soldOut && stock <= LOW_STOCK
  const href = `/product/${slug}`
  const shownColors = colors?.slice(0, 5) ?? []

  return (
    <article className={cn('group relative flex flex-col', className)} data-fly-scope>
      <div className="relative rounded-[var(--radius)] transition-[transform,box-shadow] duration-500 ease-out-expo group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)] motion-reduce:group-hover:translate-y-0">
      <Link
        to={href}
        data-fly-source
        className="relative block aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-surface-2 focus-visible:outline-offset-4"
        aria-label={`${name}${soldOut ? ', sold out' : ''}`}
      >
        <ProductImage
          src={images[0]}
          alt=""
          eager={eager}
          sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
          className={cn('transition-[opacity,transform] duration-700 ease-out-expo group-hover:scale-[1.035]', soldOut && 'grayscale-[0.6]')}
        />
        {images[1] ? (
          <ProductImage
            src={images[1]}
            alt=""
            hideOnError
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="!opacity-0 transition-[opacity,transform] duration-500 ease-out-expo group-hover:!opacity-100 group-hover:scale-[1.035]"
          />
        ) : null}

        <div className="pointer-events-none absolute left-2.5 right-14 top-2.5 flex flex-wrap gap-1.5">
          {badges.map(b => (
            <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink shadow-[var(--shadow-soft)] backdrop-blur">
              <span className={cn('h-1.5 w-1.5 rounded-full', BADGE_DOT[b])} aria-hidden="true" />
              {BADGE_LABEL[b]}
            </span>
          ))}
          {pct > 0 ? <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-bg tabular">−{pct}%</span> : null}
        </div>

        {soldOut ? (
          <div className="absolute inset-0 grid place-items-center bg-bg/40">
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink">Sold out</span>
          </div>
        ) : low ? (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-warning shadow-[var(--shadow-soft)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Only {stock} left
          </span>
        ) : null}
      </Link>
      <HeartButton product={product} className="absolute right-2.5 top-2.5" />
      </div>

      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        <h3 className="text-[17px] font-medium leading-snug tracking-[-0.01em] sm:text-lg">
          <Link to={href} className="line-clamp-2 transition-colors hover:text-accent sm:line-clamp-1" tabIndex={-1}>{name}</Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{tagline}</p>

        {shownColors.length > 1 ? (
          <div className="mt-2.5 flex items-center gap-1.5" role="group" aria-label={`Colour for ${name}`}>
            {shownColors.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-pressed={color === c.name}
                aria-label={c.name}
                title={c.name}
                className={cn(
                  'h-4 w-4 rounded-full ring-offset-2 ring-offset-bg transition-shadow',
                  color === c.name ? 'ring-[1.5px] ring-ink' : 'ring-0 hover:ring-1 hover:ring-line',
                )}
              >
                <span className="block h-full w-full rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]" style={{ backgroundColor: c.hex }} />
              </button>
            ))}
            {colors && colors.length > shownColors.length ? <span className="text-xs text-muted">+{colors.length - shownColors.length}</span> : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="flex min-w-0 items-baseline gap-1.5 tabular">
            <span className="text-[15px] font-semibold">{money(price)}</span>
            {pct > 0 && compareAtPrice ? <s className="truncate text-xs text-muted">{money(compareAtPrice)}</s> : null}
          </span>
          <AddToCartButton product={product} color={color} variant="compact" />
        </div>
      </div>
    </article>
  )
}
