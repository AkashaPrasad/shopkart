import { Cable, Candy, LampDesk, PenLine, Pin, Sticker, type LucideIcon } from 'lucide-react'
import type { Category } from '@/types'
import { CATEGORIES } from '@/hooks/useProducts'
import { CATEGORY_LABELS } from '@/lib/format'

export interface CategoryCopy {
  key: Category
  label: string
  /** One-liner for menus. */
  blurb: string
  /** Shop page headline: plain lead + italic accent word(s). */
  headline: [string, string]
  icon: LucideIcon
}

const COPY: Record<Category, Omit<CategoryCopy, 'key' | 'label'>> = {
  stickers: { blurb: 'For laptop lids with opinions.', headline: ['Stickers, ', 'seriously.'], icon: Sticker },
  pins: { blurb: 'Enamel flair for every lapel.', headline: ['Pins with ', 'personality.'], icon: Pin },
  stationery: { blurb: 'Gel pens, washi and tiny notebooks.', headline: ['Stationery for ', 'list-makers.'], icon: PenLine },
  desk: { blurb: 'Small upgrades for long days.', headline: ['Desk things, ', 'pocket-sized.'], icon: LampDesk },
  tech: { blurb: 'Grips, ties and tidy cables.', headline: ['Tiny tech, ', 'tidy life.'], icon: Cable },
  snacks: { blurb: 'Desk candy. Zero regrets.', headline: ['Desk candy, ', 'no regrets.'], icon: Candy },
}

export const CATEGORY_LIST: CategoryCopy[] = CATEGORIES.map(key => ({ key, label: CATEGORY_LABELS[key] ?? key, ...COPY[key] }))

export function categoryCopy(key: string): CategoryCopy | undefined {
  return CATEGORY_LIST.find(c => c.key === key)
}
