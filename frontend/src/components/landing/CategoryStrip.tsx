import { Link } from 'react-router-dom'
import { CATEGORY_LABELS } from '@/lib/format'
import type { Category } from '@/types'
import { useCatalogStats } from './data'
import { CATEGORY_ICONS } from './constants'
import { SectionHeading } from './shared'

const AISLES: { key: Category; blurb: string }[] = [
  { key: 'stickers', blurb: 'Peel, stick, smile' },
  { key: 'pins', blurb: 'Enamel flair' },
  { key: 'stationery', blurb: 'Pens, pads, tape' },
  { key: 'desk', blurb: 'Desk-side company' },
  { key: 'tech', blurb: 'Grips & cable tidy' },
  { key: 'snacks', blurb: 'Desk candy' },
]

export function CategoryStrip() {
  const { categoryCounts } = useCatalogStats()

  return (
    <section aria-labelledby="aisles-heading" className="container-x pb-16 sm:pb-24">
      <SectionHeading eyebrow="Aisles" title={<span id="aisles-heading">Rummage by aisle</span>} />
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {AISLES.map(({ key, blurb }) => {
          const Icon = CATEGORY_ICONS[key]
          const count = categoryCounts[key]
          return (
            <li key={key}>
              <Link
                to={`/shop?category=${key}`}
                className="group flex h-full flex-col items-start gap-5 rounded-[14px] border border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[var(--shadow-soft)] lg:gap-8"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-ink">
                  <Icon size={22} />
                </span>
                <span className="w-full min-w-0">
                  <span className="flex items-baseline gap-1.5 font-medium">
                    {CATEGORY_LABELS[key]}
                    {count ? <span className="tabular text-xs font-normal text-muted">{count}</span> : null}
                  </span>
                  <span className="block truncate text-[13px] text-muted">{blurb}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
