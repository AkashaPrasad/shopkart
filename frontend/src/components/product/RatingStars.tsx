import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RatingStars({ rating, count, size = 'md', className }: { rating: number; count?: number; size?: 'sm' | 'md'; className?: string }) {
  const value = Math.max(0, Math.min(5, rating))
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const label = `Rated ${value.toFixed(1)} out of 5${count != null ? `, ${count} review${count === 1 ? '' : 's'}` : ''}`
  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="img" aria-label={label}>
      <span className="relative inline-flex" aria-hidden="true">
        <span className="flex gap-0.5 text-line">
          {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn(icon, 'fill-current')} strokeWidth={0} />)}
        </span>
        <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-ink" style={{ width: `${(value / 5) * 100}%` }}>
          {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn(icon, 'shrink-0 fill-current')} strokeWidth={0} />)}
        </span>
      </span>
      <span aria-hidden="true" className={cn('tabular text-ink', size === 'sm' ? 'text-xs' : 'text-sm font-medium')}>
        {value.toFixed(1)}
        {count != null ? <span className="ml-1 font-normal text-muted">({count.toLocaleString('en-IN')})</span> : null}
      </span>
    </span>
  )
}
