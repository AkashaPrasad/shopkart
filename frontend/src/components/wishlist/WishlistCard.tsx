import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useWishlist, type WishProduct } from '@/store/wishlist'
import { errorMessage } from '@/lib/api'
import { discountPct, money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/components/product/ProductImage'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { LOW_STOCK } from '@/components/product/StockBadge'
import { productImage } from '@/components/cart/cartActions'

/** Saved item: image, price, stock, colour choice, add-to-cart (opens mini cart) and remove-with-undo. */
export function WishlistCard({ product }: { product: WishProduct }) {
  const remove = useWishlist(s => s.remove)
  const add = useWishlist(s => s.add)
  const pending = useWishlist(s => !!s.pending[product._id])
  const [color, setColor] = useState<string | null>(product.colors?.[0]?.name ?? null)
  const href = `/product/${product.slug}`
  const soldOut = product.stock <= 0
  const low = !soldOut && product.stock <= LOW_STOCK
  const pct = discountPct(product.price, product.compareAtPrice)

  async function onRemove() {
    try {
      const removed = await remove(product._id)
      if (!removed) return
      toast(`Removed ${removed.name}`, {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => { add(removed).catch((e: unknown) => toast.error(errorMessage(e, 'Couldn’t put that back.'))) },
        },
      })
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t remove that. Try again.'))
    }
  }

  return (
    <article className="group flex flex-col" data-fly-scope>
      <div className="relative rounded-[var(--radius)] transition-[transform,box-shadow] duration-500 ease-out-expo group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)] motion-reduce:group-hover:translate-y-0">
        <Link to={href} data-fly-source className="relative block aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-surface-2" aria-label={product.name}>
          <ProductImage src={productImage(product)} alt="" sizes="(min-width:1024px) 25vw, 50vw" className={cn('transition-transform duration-700 ease-out-expo group-hover:scale-[1.035]', soldOut && 'grayscale-[0.6]')} />
          {pct > 0 ? <span className="absolute left-2.5 top-2.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-bg tabular">−{pct}%</span> : null}
          {soldOut ? (
            <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Sold out</span>
          ) : low ? (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-warning backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Only {product.stock} left
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Remove ${product.name} from your wishlist`}
          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-ink shadow-[var(--shadow-soft)] backdrop-blur transition-[transform,background-color] hover:scale-105 hover:bg-surface active:scale-95 disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        <h3 className="text-[17px] font-medium leading-snug tracking-[-0.01em]">
          <Link to={href} tabIndex={-1} className="line-clamp-2 transition-colors hover:text-accent sm:line-clamp-1">{product.name}</Link>
        </h3>
        {product.tagline ? <p className="mt-0.5 line-clamp-1 text-sm text-muted">{product.tagline}</p> : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-baseline gap-1.5 tabular">
            <span className="text-[15px] font-semibold">{money(product.price)}</span>
            {pct > 0 && product.compareAtPrice ? <s className="text-xs text-muted">{money(product.compareAtPrice)}</s> : null}
          </span>
          {product.colors && product.colors.length > 1 ? (
            <span className="flex items-center gap-1.5" role="group" aria-label={`Colour for ${product.name}`}>
              {product.colors.slice(0, 4).map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  aria-pressed={color === c.name}
                  aria-label={c.name}
                  title={c.name}
                  className={cn('h-4 w-4 rounded-full ring-offset-2 ring-offset-bg transition-shadow', color === c.name ? 'ring-[1.5px] ring-ink' : 'hover:ring-1 hover:ring-line')}
                >
                  <span className="block h-full w-full rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]" style={{ backgroundColor: c.hex }} />
                </button>
              ))}
            </span>
          ) : null}
        </div>
        <div className="mt-auto pt-4">
          <AddToCartButton product={product} color={color} variant="block" />
        </div>
      </div>
    </article>
  )
}
