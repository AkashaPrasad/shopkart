import { useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductImage } from './ProductImage'

/** Main image + thumbnails. Arrow keys (when focused), arrow buttons, thumbnail clicks and horizontal swipes all navigate. */
export function Gallery({ images, alt, className }: { images: string[]; alt: string; className?: string }) {
  const list = images.length ? images : ['']
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const reduce = useReducedMotion()
  const many = list.length > 1
  const current = Math.min(index, list.length - 1)

  function go(next: number) {
    const n = (next + list.length) % list.length
    setDirection(n > current || (current === list.length - 1 && n === 0) ? 1 : -1)
    setIndex(n)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!many) return
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(list.length - 1) }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) < 50 && Math.abs(info.velocity.x) < 400) return
    go(info.offset.x < 0 ? current + 1 : current - 1)
  }

  const slide = reduce ? 0 : 28

  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row-reverse lg:gap-4', className)}>
      <div
        data-fly-source
        className="group relative aspect-[4/5] flex-1 overflow-hidden rounded-[var(--radius)] bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        tabIndex={many ? 0 : -1}
        onKeyDown={onKeyDown}
        role="region"
        aria-roledescription="carousel"
        aria-label={many ? `${alt} photos. Use the left and right arrow keys to browse.` : `${alt} photo`}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * slide }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * slide }}
            transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
            drag={many && !reduce ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
          >
            <ProductImage src={list[current]} alt={many ? `${alt} — photo ${current + 1} of ${list.length}` : alt} eager={current === 0} sizes="(min-width:1024px) 50vw, 100vw" />
          </motion.div>
        </AnimatePresence>

        {many ? (
          <>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => go(current - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink opacity-0 shadow-[var(--shadow-soft)] backdrop-blur transition-[opacity,transform] duration-200 group-hover:opacity-100 sm:grid active:scale-[0.98]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => go(current + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink opacity-0 shadow-[var(--shadow-soft)] backdrop-blur transition-[opacity,transform] duration-200 group-hover:opacity-100 sm:grid active:scale-[0.98]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="sr-only" aria-live="polite">Photo {current + 1} of {list.length}</span>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium tabular text-ink backdrop-blur" aria-hidden="true">
              {current + 1} / {list.length}
            </span>
          </>
        ) : null}
      </div>

      {many ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible" role="group" aria-label="Choose photo">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === current}
              className={cn(
                'relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[10px] bg-surface-2 transition-[box-shadow,opacity] duration-200 lg:w-full',
                i === current ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : 'opacity-60 hover:opacity-100',
              )}
            >
              <ProductImage src={src} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
