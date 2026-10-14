import type { ComponentProps, KeyboardEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { inputClass } from './form'

/** Password field with a show/hide toggle and a quiet Caps Lock hint. */
export function PasswordInput({ className, onKeyUp, onBlur, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const [caps, setCaps] = useState(false)
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.('CapsLock') ?? false)
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onKeyUp={(e) => { checkCaps(e); onKeyUp?.(e) }}
        onBlur={(e) => { setCaps(false); onBlur?.(e) }}
        className={cn(inputClass, 'pr-12', className)}
      />
      {caps ? (
        <span className="pointer-events-none absolute top-1/2 right-12 -translate-y-1/2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">Caps Lock</span>
      ) : null}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

/** 0–4 heuristic score; only a nudge — the server enforces the real rule (≥ 8 chars). */
export function passwordScore(pw: string) {
  if (pw.length < 8) return 0
  let s = 1
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  else if (/\d|[^A-Za-z0-9]/.test(pw)) s += 0.5
  return Math.min(4, Math.floor(s))
}

const LABELS = ['Too short', 'Fine', 'Good', 'Strong', 'Excellent']

export function PasswordMeter({ value }: { value: string }) {
  const score = passwordScore(value)
  if (!value) return null
  const tone = score === 0 ? 'bg-danger' : score === 1 ? 'bg-warning' : 'bg-success'
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1 rounded-full transition-colors duration-300', i <= Math.max(score, value ? 1 : 0) ? tone : 'bg-line')} />
        ))}
      </div>
      <span className="w-[70px] text-right text-[12px] text-muted">{LABELS[score]}</span>
    </div>
  )
}
