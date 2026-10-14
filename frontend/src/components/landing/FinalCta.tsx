import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/shared/Logo'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import { money } from '@/lib/format'
import { ArrowRightIcon } from './icons'
import { Reveal } from './Reveal'

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="container-x pb-4 sm:pb-8">
      <Reveal
        y={24}
        className="relative isolate overflow-hidden rounded-[28px] bg-ink px-6 py-14 text-bg sm:px-12 sm:py-20 lg:px-16"
      >
        {/* Oversized brand mark; the band inverts ink and paper, so its strokes are re-inked in a faint paper tone. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -bottom-24 -z-10 size-52 rotate-[-10deg] sm:-right-6 sm:-bottom-14 sm:size-80 lg:right-10 lg:-bottom-10 lg:size-[22rem]"
          style={{ '--ink': 'color-mix(in srgb, var(--bg) 16%, transparent)' } as React.CSSProperties}
        >
          <LogoMark className="size-full" />
        </span>
        <h2 id="cta-heading" className="max-w-[12ch] font-display text-[clamp(2.6rem,7.5vw,5.75rem)] leading-[0.95] font-medium tracking-[-0.035em]">
          Your desk deserves a <em className="text-accent">treat.</em>
        </h2>
        <p className="mt-5 max-w-sm text-base text-bg/65 sm:text-lg">
          Ships in 24 hours. Free shipping over{'\u00a0'}
          {money(FREE_SHIPPING_THRESHOLD)}.
        </p>
        <Link
          to="/shop"
          className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-accent pr-5 pl-6 text-[15px] font-medium text-accent-ink transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
        >
          Start shopping
          <ArrowRightIcon size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </section>
  )
}
