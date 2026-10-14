import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Lazy image that fills its (aspect-ratio) parent, fades in on load and falls back to a neutral tile on error.
 * The parent owns the box size so there is never layout shift.
 */
export function ProductImage({ src, alt, className, eager = false, sizes, hideOnError = false }: { src?: string; alt: string; className?: string; eager?: boolean; sizes?: string; hideOnError?: boolean }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(src ? 'loading' : 'failed')
  const [shownSrc, setShownSrc] = useState(src)
  if (src !== shownSrc) { setShownSrc(src); setState(src ? 'loading' : 'failed') }

  if (state === 'failed') {
    if (hideOnError) return null
    return (
      <div role="img" aria-label={alt} className={cn('absolute inset-0 grid place-items-center bg-surface-2 text-muted/60', className)}>
        <ImageOff className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => setState('loaded')}
      onError={() => setState('failed')}
      className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-500', state === 'loaded' ? 'opacity-100' : 'opacity-0', className)}
    />
  )
}
