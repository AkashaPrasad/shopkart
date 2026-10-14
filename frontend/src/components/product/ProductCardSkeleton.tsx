import { cn } from '@/lib/utils'
import { Shimmer } from './Shimmer'

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true">
      <Shimmer className="aspect-[4/5] rounded-[var(--radius)]" />
      <Shimmer className="mt-4 h-4 w-3/4 rounded-full" />
      <Shimmer className="mt-2 h-3 w-1/2 rounded-full" />
      <div className="mt-4 flex items-center justify-between">
        <Shimmer className="h-4 w-12 rounded-full" />
        <Shimmer className="h-9 w-16 rounded-full" />
      </div>
    </div>
  )
}
