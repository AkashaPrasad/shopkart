import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import BlurText from '@/components/reactbits/BlurText'
import Magnet from '@/components/reactbits/Magnet'
import ShinyText from '@/components/reactbits/ShinyText'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/theme'
import type { Product } from '@/types'
import { HeroBackground } from './HeroBackground'
import { ArrowRightIcon, TruckIcon } from './icons'
import { useFeatured } from './data'
import { EASE } from './constants'
import { ProductThumb } from './shared'

const HEADLINE = [
  { text: 'Tiny things.', breakAfter: true },
  { text: 'Big joy.', className: 'italic text-accent pr-[0.06em]' },
]

/** Where the floating product chips sit, as % of the hero. Drift uses CSS (transform-only). */
const CHIP_SLOTS = [
  { pos: 'left-[4%] top-[7%] sm:left-[7%] sm:top-[13%]', rotate: -8, duration: 7, delay: -1 },
  { pos: 'right-[4%] top-[9%] sm:right-[8%] sm:top-[17%]', rotate: 7, duration: 8.5, delay: -3.5 },
  { pos: 'left-[6%] bottom-[7%] sm:left-[12%] sm:bottom-[14%]', rotate: 5, duration: 7.5, delay: -5 },
  { pos: 'right-[5%] bottom-[9%] sm:right-[11%] sm:bottom-[11%]', rotate: -6, duration: 9, delay: -2 },
]

function FloatingChips({ items }: { items: Product[] }) {
  const reduce = useReducedMotion()
  return (
    <>
      {items.slice(0, CHIP_SLOTS.length).map((p, i) => {
        const slot = CHIP_SLOTS[i]
        return (
          <motion.div
            key={p._id}
            className={cn('absolute z-0', slot.pos)}
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45 + i * 0.08, ease: EASE }}
          >
            <div style={{ transform: `rotate(${slot.rotate}deg)` }}>
              <div
                className="[animation:sk-drift_var(--sk-dur)_ease-in-out_infinite] motion-reduce:[animation:none]"
                style={{ '--sk-dur': `${slot.duration}s`, animationDelay: `${slot.delay}s` } as React.CSSProperties}
              >
                <Link
                  to={`/product/${p.slug}`}
                  className="group relative block rounded-[18px] border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.04]"
                  aria-label={`${p.name}, ${money(p.price)}`}
                >
                  <ProductThumb
                    src={p.images[0]}
                    alt=""
                    category={p.category}
                    eager
                    className="size-14 rounded-[12px] sm:size-20 lg:size-24"
                  />
                  <span className="tabular absolute -right-2 -bottom-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-bg shadow-[var(--shadow-soft)] sm:text-xs">
                    {money(p.price)}
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        )
      })}
    </>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const dark = useTheme(s => s.theme) === 'dark'
  const { items } = useFeatured()
  const fadeUp = (delay: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: EASE },
        }

  return (
    <section className="relative isolate flex min-h-[calc(100svh-var(--header-h,64px))] items-center overflow-hidden">
      <HeroBackground />

      <div className="container-x relative z-10 flex flex-col items-center py-28 text-center sm:py-24">
        <motion.p
          {...fadeUp(0)}
          className="mb-6 inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 text-[13px] font-medium backdrop-blur-sm"
        >
          <TruckIcon size={16} className="text-accent" />
          <ShinyText
            text={`Free shipping over ${money(FREE_SHIPPING_THRESHOLD)}`}
            color={dark ? '#a39d93' : '#5b5750'}
            shineColor={dark ? '#ffffff' : '#ff5a1f'}
            speed={1.6}
            delay={4}
            shineWidth={30}
          />
        </motion.p>

        <BlurText
          as="h1"
          segments={HEADLINE}
          delay={90}
          direction="bottom"
          stepDuration={0.28}
          easing={EASE}
          animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 28 }}
          animationTo={[
            { filter: 'blur(4px)', opacity: 0.6, y: -3 },
            { filter: 'blur(0px)', opacity: 1, y: 0 },
          ]}
          className="justify-center font-display text-[clamp(3.5rem,16.5vw,9.5rem)] leading-[0.95] font-medium tracking-[-0.04em]"
        />

        <motion.p {...fadeUp(0.3)} className="mt-6 max-w-[36rem] text-pretty text-base text-muted sm:text-lg">
          Small objects. Honest prices. Desk &amp; everyday delights, shipped across India.
        </motion.p>

        <motion.div {...fadeUp(0.4)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Magnet padding={70} magnetStrength={4} maxOffset={12}>
            <Link
              to="/shop"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink pr-5 pl-6 text-[15px] font-medium text-bg shadow-[var(--shadow-lift)] transition-colors duration-300 hover:bg-accent hover:text-accent-ink"
            >
              Shop everything
              <ArrowRightIcon size={18} className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
            </Link>
          </Magnet>
          <Link
            to="/shop?sort=popular"
            className="inline-flex h-12 items-center rounded-full border border-line bg-surface/70 px-6 text-[15px] font-medium backdrop-blur-sm transition-colors duration-300 hover:border-ink/30 hover:bg-surface"
          >
            Bestsellers
          </Link>
        </motion.div>
      </div>

      <FloatingChips items={items} />
    </section>
  )
}
