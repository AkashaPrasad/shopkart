import { motion, useReducedMotion } from 'motion/react'
import type { ProductLite } from '@/types'
import { cn } from '@/lib/utils'
import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from './ProductCardSkeleton'

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14'

export function ProductGrid({ products, skeletons = 0, className, dimmed = false }: { products: ProductLite[]; skeletons?: number; className?: string; dimmed?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className={cn(GRID, 'transition-opacity duration-300', dimmed && 'pointer-events-none opacity-50', className)} aria-busy={dimmed || skeletons > 0}>
      {products.map((p, i) => (
        <motion.div
          key={p._id}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : Math.min(i % 12, 8) * 0.04 }}
          className="flex"
        >
          <ProductCard product={p} eager={i < 4} className="w-full" />
        </motion.div>
      ))}
      {Array.from({ length: skeletons }, (_, i) => <ProductCardSkeleton key={`s${i}`} />)}
    </div>
  )
}
