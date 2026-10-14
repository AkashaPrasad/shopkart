import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="text-sm text-ink">{message}</p>
      {onRetry ? <Button variant="outline" className="mt-4 rounded-full" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button> : null}
    </div>
  )
}
