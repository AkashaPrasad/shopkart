import { cn } from '@/lib/utils'

/**
 * ShopKart brand mark: a cart carrying one tangerine — the "tiny thing" that brings big joy.
 * Strokes and wheels use `--ink` (so the mark inverts in dark mode); the fruit uses `--accent`.
 * Built on a 32-unit grid with a 2.75 stroke so it holds up from 16px favicons to 200px hero use.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('size-7 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="17.6" cy="13.9" r="5.4" fill="var(--accent)" />
      <path d="M19.1 9.2c.4-2.1 1.9-3.4 4.1-3.6-.3 2.1-1.8 3.5-4.1 3.6z" fill="var(--ink)" />
      <path
        d="M3.25 6.25h3.5l3.1 14.75h15.1l2.8-9.75"
        stroke="var(--ink)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11.6" cy="26.1" r="2.3" fill="var(--ink)" />
      <circle cx="23.1" cy="26.1" r="2.3" fill="var(--ink)" />
    </svg>
  )
}

/** Brand lockup. `variant="mark"` renders the glyph only; `full` adds the Fraunces wordmark. */
export function Logo({ className, variant = 'full' }: { className?: string; variant?: 'mark' | 'full' }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-ink', className)} aria-label="ShopKart" role="img">
      <LogoMark className="size-[1.75em] -translate-y-[0.04em]" />
      {variant === 'full' ? (
        <span
          aria-hidden="true"
          className="font-display text-xl leading-none font-semibold tracking-[-0.035em]"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          ShopKart
        </span>
      ) : null}
    </span>
  )
}
