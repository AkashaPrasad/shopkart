import type { ComponentType } from 'react'
import type { Category } from '@/types'
import { CandyIcon, PenIcon, PhoneIcon, PinIcon, PlantIcon, StickerIcon } from './icons'

/** Brand easing for every landing animation. */
export const EASE = [0.22, 1, 0.36, 1] as const

export const CATEGORY_ICONS: Record<Category, ComponentType<{ size?: number; className?: string }>> = {
  stickers: StickerIcon,
  pins: PinIcon,
  stationery: PenIcon,
  desk: PlantIcon,
  tech: PhoneIcon,
  snacks: CandyIcon,
}

/**
 * Shown only until `/products` answers with `facets.priceRange.min`. Mirrors the catalog floor in
 * BRIEF.md "PRICING RESET" (₹49); `src/lib/constants.ts` has no price-floor constant.
 */
export const STARTING_PRICE_FALLBACK = 4900
