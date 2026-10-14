import { useEffect } from 'react'
import { CategoryStrip } from '@/components/landing/CategoryStrip'
import { FinalCta } from '@/components/landing/FinalCta'
import { Hero } from '@/components/landing/Hero'
import { ProductMarquee } from '@/components/landing/ProductMarquee'
import { ValueBento } from '@/components/landing/ValueBento'

/** Transform-only keyframes used by the hero chips and the marquee (reduced motion disables both). */
const KEYFRAMES = `
@keyframes sk-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -10px, 0); } }
@keyframes sk-marquee { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
`

export default function Landing() {
  useEffect(() => {
    document.title = 'ShopKart — Tiny things. Big joy.'
  }, [])

  return (
    <>
      <style>{KEYFRAMES}</style>
      <Hero />
      <ProductMarquee />
      <ValueBento />
      <CategoryStrip />
      <FinalCta />
    </>
  )
}
