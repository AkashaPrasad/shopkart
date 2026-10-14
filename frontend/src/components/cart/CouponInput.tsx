import { useId, useState, type FormEvent } from 'react'
import { Loader2, Tag, X } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Coupon field. Owns its pending + inline error state; `onApply` / `onRemove` should throw on failure
 * (the thrown message is shown inline). Once applied, renders as a removable chip.
 */
export function CouponInput({ onApply, onRemove, coupon, couponError, disabled = false, hint, className }: {
  onApply: (code: string) => Promise<void>
  onRemove: () => Promise<void>
  /** Applied coupon code. */
  coupon?: string | null
  /** Why the coupon isn't (or is no longer) applied, e.g. the cart dropped below its minimum. */
  couponError?: string | null
  disabled?: boolean
  /** Optional muted note under the applied chip, e.g. why it isn't saving anything right now. */
  hint?: string
  className?: string
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'apply' | 'remove' | null>(null)
  const inputId = useId()
  const errorId = useId()
  const valid = !couponError
  const note = valid ? hint : couponError

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value) { setError('Enter a coupon code.'); return }
    setPending('apply'); setError(null)
    try {
      await onApply(value)
      setCode('')
    } catch (err) {
      setError(errorMessage(err, 'That code didn’t work.'))
    } finally { setPending(null) }
  }

  async function remove() {
    setPending('remove'); setError(null)
    try { await onRemove() } catch (err) { setError(errorMessage(err, 'Couldn’t remove the coupon.')) } finally { setPending(null) }
  }

  if (coupon) {
    return (
      <div className={className}>
        <div className={cn('flex items-center justify-between gap-3 rounded-full border border-dashed py-1.5 pl-4 pr-1.5', valid ? 'border-success/50 bg-success/5' : 'border-warning/60 bg-warning/5')}>
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Tag className={cn('h-4 w-4 shrink-0', valid ? 'text-success' : 'text-warning')} aria-hidden="true" />
            <span className="truncate"><span className="font-semibold tracking-wide">{coupon}</span> <span className="text-muted">{valid ? 'applied' : 'not applied'}</span></span>
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={disabled || pending !== null}
            aria-label={`Remove coupon ${coupon}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {pending === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {note ? <p className={cn('mt-2 px-4 text-xs', valid ? 'text-muted' : 'text-warning')}>{note}</p> : null}
        {error ? <p role="alert" className="mt-2 px-4 text-sm text-danger">{error}</p> : null}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={className} noValidate>
      <label htmlFor={inputId} className="sr-only">Coupon code</label>
      <div
        className={cn(
          'flex h-12 items-center gap-2 rounded-full border bg-surface pl-4 pr-1.5 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(17_17_17/0.06)]',
          error ? 'border-danger/60' : 'border-line',
        )}
      >
        <Tag className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          id={inputId}
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); if (error) setError(null) }}
          placeholder="Coupon code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={24}
          disabled={disabled || pending !== null}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium uppercase tracking-wide outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || pending !== null || !code.trim()}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 disabled:opacity-40 active:scale-[0.98]"
        >
          {pending === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Apply
        </button>
      </div>
      {error ? <p id={errorId} role="alert" className="mt-2 px-4 text-sm text-danger">{error}</p> : null}
      {!error && couponError ? <p className="mt-2 px-4 text-xs text-warning">{couponError}</p> : null}
    </form>
  )
}
