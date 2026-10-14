import type { ComponentProps, ReactNode } from 'react'
import { useId } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/* ----------------------------------------------------------------------------
 * Form + button primitives shared by auth, checkout, address and account screens.
 * ------------------------------------------------------------------------- */

export const EASE = [0.22, 1, 0.36, 1] as const

const pillBase =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.005em] transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0'

const pillVariants = {
  ink: 'bg-ink text-bg hover:bg-ink/85',
  accent: 'bg-accent text-accent-ink shadow-[0_10px_24px_-14px_var(--accent)] hover:shadow-[0_14px_28px_-12px_var(--accent)] hover:brightness-[1.04]',
  outline: 'border border-line bg-surface text-ink hover:border-ink/30 hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-danger text-white hover:bg-danger/90',
  'danger-ghost': 'text-danger hover:bg-danger/8',
} as const

const pillSizes = {
  sm: 'h-9 px-4 text-[13px] [&_svg]:size-3.5',
  md: 'h-11 px-6 text-sm [&_svg]:size-4',
  lg: 'h-12 px-7 text-[15px] [&_svg]:size-4',
} as const

export type PillVariant = keyof typeof pillVariants
export function pill(variant: PillVariant = 'ink', size: keyof typeof pillSizes = 'md', className?: string) {
  return cn(pillBase, pillVariants[variant], pillSizes[size], className)
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} aria-hidden="true" />
}

/** Pill button that swaps its label for a spinner (keeping its width) while `loading`. */
export function PillButton({ variant = 'ink', size = 'md', loading, loadingText, className, children, disabled, ...rest }: ComponentProps<'button'> & { variant?: PillVariant; size?: keyof typeof pillSizes; loading?: boolean; loadingText?: string }) {
  return (
    <button {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={pill(variant, size, className)}>
      {loading ? (<><Spinner className="size-4" />{loadingText ?? children}</>) : children}
    </button>
  )
}

export const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink shadow-[inset_0_1px_0_rgba(20,14,4,0.02)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted/60 hover:border-ink/25 focus-visible:outline-none focus:border-ink/70 focus:ring-[3px] focus:ring-ink/[0.07] aria-[invalid=true]:border-danger/70 aria-[invalid=true]:focus:ring-danger/10 disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-surface-2 read-only:text-muted'

export interface FieldControlProps { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }

/**
 * Label + control + hint/error, with ids wired for screen readers.
 * The control is a render prop so any input (native, password, radio pills) can use it.
 */
export function Field({ label, error, hint, optional, aside, className, children }: {
  label: ReactNode
  error?: string
  hint?: ReactNode
  optional?: boolean
  aside?: ReactNode
  className?: string
  children: (p: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
          {optional ? <span className="ml-1.5 font-normal text-muted">optional</span> : null}
        </label>
        {aside}
      </div>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      <AnimatePresence initial={false} mode="popLayout">
        {error ? (
          <motion.p
            key="err"
            id={errId}
            initial={reduce ? false : { opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.06 } }}
            transition={{ duration: 0.18, ease: EASE }}
            className="flex items-start gap-1.5 text-[13px] leading-snug text-danger"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.div key="hint" id={hintId} initial={false} className="text-[13px] leading-snug text-muted">{hint}</motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

type BannerTone = 'danger' | 'info' | 'success' | 'warning'
const bannerTone: Record<BannerTone, string> = {
  danger: 'border-danger/25 bg-danger/[0.06] text-ink [&_[data-icon]]:text-danger',
  info: 'border-line bg-surface-2/70 text-ink [&_[data-icon]]:text-muted',
  success: 'border-success/25 bg-success/[0.07] text-ink [&_[data-icon]]:text-success',
  warning: 'border-warning/30 bg-warning/[0.08] text-ink [&_[data-icon]]:text-warning',
}
const bannerIcon: Record<BannerTone, typeof Info> = { danger: AlertCircle, info: Info, success: CheckCircle2, warning: AlertCircle }

/** Calm inline message for server errors / notices. Animates in and out. */
export function FormBanner({ tone = 'danger', title, children, action, className, show = true }: {
  tone?: BannerTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
  show?: boolean
}) {
  const reduce = useReducedMotion()
  const Icon = bannerIcon[tone]
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="overflow-hidden"
        >
          <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border px-3.5 py-3 text-sm', bannerTone[tone], className)}>
            <Icon data-icon="" className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-snug">
              {title ? <p className="font-medium">{title}</p> : null}
              {children ? <div className={cn(title ? 'mt-0.5 text-muted' : '')}>{children}</div> : null}
              {action ? <div className="mt-2">{action}</div> : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Extracts `{ fields: { name: message } }` from a backend validation error. */
export function serverFieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError)) return {}
  const fields = (e.details as { fields?: unknown } | undefined)?.fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {}
  return Object.fromEntries(Object.entries(fields as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Record<string, string>
}

/** Only allow same-origin relative paths for `?next=` to avoid open redirects. */
export function safeNext(raw: string | null | undefined, fallback = '/shop') {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (raw.startsWith('/login') || raw.startsWith('/register')) return fallback
  return raw
}

export function firstName(name?: string | null) {
  return (name ?? '').trim().split(/\s+/)[0] || 'there'
}
