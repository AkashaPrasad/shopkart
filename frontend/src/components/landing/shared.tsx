import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'
import { CATEGORY_ICONS } from './constants'
import { StickerIcon } from './icons'

/** Product image in a fixed aspect box; falls back to the category icon if the image fails. */
export function ProductThumb({
  src,
  alt,
  category,
  className,
  sizes,
  eager = false,
}: {
  src?: string
  alt: string
  category: Category
  className?: string
  sizes?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const Fallback = CATEGORY_ICONS[category] ?? StickerIcon
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-muted" role="img" aria-label={alt}>
          <Fallback size={28} />
        </div>
      )}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, className }: { eyebrow?: string; title: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {eyebrow ? <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{eyebrow}</p> : null}
      <h2 className="text-balance font-display text-[2rem] leading-[1.02] font-medium sm:text-5xl">{title}</h2>
    </div>
  )
}
