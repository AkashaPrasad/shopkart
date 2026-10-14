import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'
import { EASE } from './form'

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .08 0 0 0 0 .06 0 0 0 0 .02 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** Warm paper backdrop: two soft colour pools, a faint dot grid, and grain. Purely decorative. */
export function PaperBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-accent/[0.10] blur-[110px] dark:bg-accent/[0.08]" />
      <div className="absolute -right-40 -bottom-48 size-[560px] rounded-full bg-accent-2/[0.07] blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.55] dark:opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 75%)',
        }}
      />
      <div className="absolute inset-0 opacity-[0.35] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-screen" style={{ backgroundImage: NOISE }} />
    </div>
  )
}

/** Centered auth card. `title` is a node so pages can italicise an accent word. */
export function AuthCard({ title, subtitle, children, footer }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <section className="relative isolate">
      <PaperBackdrop />
      <div className="container-x flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10 sm:py-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-[440px]"
        >
          <div className="relative rounded-[22px] border border-line bg-surface px-5 pt-7 pb-6 shadow-[var(--shadow-lift)] sm:px-9 sm:pt-9 sm:pb-8">
            {/* perforation detail — a nod to receipts and sticker sheets */}
            <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-[repeating-linear-gradient(90deg,var(--line)_0_6px,transparent_6px_12px)]" />
            <Link to="/" className="inline-flex rounded-lg" aria-label="ShopKart home"><Logo /></Link>
            <h1 className="mt-7 font-display text-[2.15rem] leading-[1.04] font-medium text-balance sm:text-[2.4rem]">{title}</h1>
            {subtitle ? <p className="mt-2.5 text-[15px] leading-relaxed text-muted text-pretty">{subtitle}</p> : null}
            <div className="mt-7">{children}</div>
          </div>
          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </motion.div>
      </div>
    </section>
  )
}

/** Hairline divider with a centered label ("or"). */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-[12px] font-medium tracking-[0.14em] text-muted uppercase" role="separator">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
