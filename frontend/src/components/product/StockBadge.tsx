import { cn } from '@/lib/utils'

export const LOW_STOCK = 5

export function stockState(stock: number): 'out' | 'low' | 'in' {
  if (stock <= 0) return 'out'
  if (stock <= LOW_STOCK) return 'low'
  return 'in'
}

export function StockBadge({ stock, className }: { stock: number; className?: string }) {
  const s = stockState(stock)
  const text = s === 'out' ? 'Sold out' : s === 'low' ? `Only ${stock} left` : 'In stock'
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', s === 'out' ? 'text-danger' : s === 'low' ? 'text-warning' : 'text-success', className)}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {s === 'low' ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" /> : null}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      <span className="font-medium">{text}</span>
      {s === 'in' ? <span className="text-muted">· ships within 24 hours</span> : null}
    </span>
  )
}
