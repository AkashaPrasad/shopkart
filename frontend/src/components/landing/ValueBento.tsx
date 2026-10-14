import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import { COD_FEE, FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS } from '@/lib/constants'
import { money } from '@/lib/format'
import { useTheme } from '@/store/theme'
import { STARTING_PRICE_FALLBACK } from './constants'
import { useCatalogStats } from './data'
import { BoxIcon, RupeeIcon, ShieldIcon } from './icons'
import { Reveal } from './Reveal'
import { SectionHeading } from './shared'

const PROPS = [
  {
    Icon: RupeeIcon,
    title: 'Honest prices',
    body: 'No inflated MRPs, no fake countdown timers. Just a fair price on a well-made little thing.',
  },
  {
    Icon: ShieldIcon,
    title: 'Pay your way',
    body: `UPI, cards, netbanking or wallets, secured by Razorpay. Prefer cash on delivery? That’s a flat ${money(COD_FEE)}.`,
  },
  {
    Icon: BoxIcon,
    title: 'Ships in 24 hours',
    body: `Packed by hand, out the door next day. Changed your mind? ${RETURN_WINDOW_DAYS}-day easy returns.`,
  },
]

/** Card surface follows the site tokens instead of SpotlightCard's built-in palette. */
const CARD_STYLE = {
  '--spotlight-card-surface': 'var(--surface)',
  '--spotlight-card-border': 'var(--line)',
  '--spotlight-card-shadow': 'var(--shadow-soft)',
} as React.CSSProperties

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-4 py-5 first:pt-0 last:pb-0 md:flex-col md:gap-2 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0">
      <span className="tabular min-w-[3.2ch] font-display text-5xl leading-none font-medium tracking-[-0.03em] sm:text-6xl">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  )
}

export function ValueBento() {
  const theme = useTheme(s => s.theme)
  const stats = useCatalogStats()
  const spotlight = { theme, spotlightColor: 'var(--accent)', intensity: theme === 'dark' ? 0.18 : 0.55, spotlightSize: 280, style: CARD_STYLE }
  const categoryCount = Object.keys(stats.categoryCounts).length || 6

  return (
    <section aria-labelledby="why-heading" className="container-x pb-16 sm:pb-24">
      <SectionHeading
        eyebrow="Why ShopKart"
        title={
          <span id="why-heading">
            The small print, <em className="text-accent">in big letters.</em>
          </span>
        }
      />

      <div className="mt-8 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-3">
        {PROPS.map(({ Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 0.07} className="h-full">
            <SpotlightCard {...spotlight} className="h-full rounded-[20px] p-6 sm:p-7">
              <span className="mb-6 grid size-11 place-items-center rounded-full bg-accent/10 text-accent md:mb-14">
                <Icon size={22} />
              </span>
              <h3 className="font-display text-2xl leading-tight font-medium">{title}</h3>
              <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted">{body}</p>
            </SpotlightCard>
          </Reveal>
        ))}

        <Reveal delay={0.21} className="md:col-span-3">
          <SpotlightCard {...spotlight} className="rounded-[20px] p-6 sm:p-8">
            <div className="divide-y divide-line md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
              <Stat value={<CountUp to={(stats.minPrice ?? STARTING_PRICE_FALLBACK) / 100} prefix="₹" />} label="starting price" />
              <Stat value={<CountUp to={FREE_SHIPPING_THRESHOLD / 100} prefix="₹" />} label="and shipping is on us" />
              {stats.status === 'error' ? (
                <Stat value={<CountUp to={categoryCount} />} label="aisles, from stickers to snacks" />
              ) : (
                <Stat
                  value={
                    stats.total === null ? (
                      <span className="inline-block h-[1em] w-[1.6ch] animate-pulse rounded-md bg-surface-2 align-baseline" aria-label="Loading" />
                    ) : (
                      <CountUp to={stats.total} />
                    )
                  }
                  label="tiny things on the shelf"
                />
              )}
            </div>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  )
}
