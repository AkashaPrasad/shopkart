import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QtyStepper({ value, min = 1, max = 10, onChange, disabled, size = 'md', className }: { value: number; min?: number; max?: number; onChange: (n: number) => void; disabled?: boolean; size?: 'sm' | 'md'; className?: string }) {
  const h = size === 'sm' ? 'h-9' : 'h-11'
  const btn = cn('grid place-items-center aspect-square h-full text-ink transition-colors hover:bg-surface-2 disabled:opacity-35 disabled:hover:bg-transparent')
  return (
    <div className={cn('inline-flex items-center overflow-hidden rounded-full border border-line bg-surface', h, className)} role="group" aria-label="Quantity">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
      <span className="min-w-8 text-center text-sm font-semibold tabular" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
    </div>
  )
}
