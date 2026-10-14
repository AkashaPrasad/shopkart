import { lazy, Suspense, useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { useTheme } from '@/store/theme'

// WebGL silk is code-split and only requested once the browser is idle, so it never blocks first paint.
const Silk = lazy(() => import('@/components/reactbits/Silk'))

/** Paper + tangerine wash. It is the first paint, the reduced-motion view and the no-WebGL fallback. */
const STATIC_WASH = [
  'radial-gradient(55% 60% at 12% 18%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)',
  'radial-gradient(45% 55% at 88% 82%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)',
  'linear-gradient(180deg, color-mix(in srgb, var(--accent) 5%, var(--bg)), var(--bg))',
].join(', ')

function shouldSkipWebGL() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return !!conn?.saveData
}

function FadeIn({ children, opacity }: { children: React.ReactNode; opacity: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div
      className="absolute inset-0 transition-opacity duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ opacity: shown ? opacity : 0 }}
    >
      {children}
    </div>
  )
}

export function HeroBackground() {
  const reduce = useReducedMotion()
  const dark = useTheme(s => s.theme) === 'dark'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (reduce || shouldSkipWebGL()) return
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setMounted(true), { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(() => setMounted(true), 300)
    return () => clearTimeout(id)
  }, [reduce])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ background: STATIC_WASH }} />
      {mounted && !reduce ? (
        <Suspense fallback={null}>
          <FadeIn opacity={dark ? 0.7 : 0.42}>
            <Silk
              key={dark ? 'dark' : 'light'}
              lightMode={!dark}
              color={dark ? '#7a3516' : '#ffb27a'}
              sheenColor={dark ? '#ffb38f' : '#ffffff'}
              speed={2.2}
              scale={0.9}
              rotation={0.4}
              noiseIntensity={dark ? 1 : 0.4}
              depth={dark ? 0.45 : 0}
              sheen={dark ? 0.35 : 0.2}
              glow={0}
              ripple={0.5}
              wave={0.8}
              intro={false}
              mouseInteraction
              interactionStrength={0.6}
              clickRipple={false}
              dpr={Math.min(window.devicePixelRatio || 1, 1.5)}
            />
          </FadeIn>
        </Suspense>
      ) : null}
      {/* Veil: keeps the silk quiet and the headline crisp. */}
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'radial-gradient(60% 55% at 50% 48%, color-mix(in srgb, var(--bg) 78%, transparent), color-mix(in srgb, var(--bg) 35%, transparent) 75%)'
            : 'radial-gradient(60% 55% at 50% 48%, color-mix(in srgb, var(--bg) 72%, transparent), color-mix(in srgb, var(--bg) 20%, transparent) 75%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  )
}
