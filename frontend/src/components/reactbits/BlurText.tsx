/**
 * BlurText — adapted from ReactBits (https://reactbits.dev/text-animations/blur-text).
 * Changes for ShopKart: styled segments (so one word can be an italic accent), optional
 * line breaks, configurable tag, an accessible label, a static render when the user
 * prefers reduced motion, and a 1s fallback so the text is never left invisible.
 */
import { motion, useReducedMotion, type Easing, type Transition } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ElementType } from 'react'

export interface BlurSegment {
  text: string
  className?: string
  /** Force a line break after this segment. */
  breakAfter?: boolean
}

type BlurTextProps = {
  text?: string
  segments?: BlurSegment[]
  as?: ElementType
  delay?: number
  className?: string
  direction?: 'top' | 'bottom'
  threshold?: number
  rootMargin?: string
  animationFrom?: Record<string, string | number>
  animationTo?: Array<Record<string, string | number>>
  easing?: Easing | Easing[]
  onAnimationComplete?: () => void
  stepDuration?: number
}

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>,
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))])
  const keyframes: Record<string, Array<string | number>> = {}
  keys.forEach(k => {
    keyframes[k] = [from[k], ...steps.map(s => s[k])]
  })
  return keyframes
}

interface Word { word: string; className?: string; breakAfter: boolean }

export default function BlurText({
  text = '',
  segments,
  as: Tag = 'p',
  delay = 200,
  className = '',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing = (t: number) => t,
  onAnimationComplete,
  stepDuration = 0.35,
}: BlurTextProps) {
  const reduce = useReducedMotion()
  const words: Word[] = useMemo(() => {
    const segs = segments ?? [{ text }]
    return segs.flatMap(seg => {
      const parts = seg.text.split(' ').filter(Boolean)
      return parts.map((word, i) => ({ word, className: seg.className, breakAfter: !!seg.breakAfter && i === parts.length - 1 }))
    })
  }, [segments, text])
  const label = words.map(w => w.word).join(' ')

  // Without an observer there is nothing to wait for: start visible.
  const [inView, setInView] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window))
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Fallbacks so the text can never stay invisible: no observer, or not seen within 1s.
    const timer = window.setTimeout(() => setInView(true), 1000)
    if (!('IntersectionObserver' in window)) return () => window.clearTimeout(timer)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [threshold, rootMargin])

  const defaultFrom = useMemo(
    () => (direction === 'top' ? { filter: 'blur(10px)', opacity: 0, y: -50 } : { filter: 'blur(10px)', opacity: 0, y: 50 }),
    [direction],
  )
  const defaultTo = useMemo(
    () => [
      { filter: 'blur(5px)', opacity: 0.5, y: direction === 'top' ? 5 : -5 },
      { filter: 'blur(0px)', opacity: 1, y: 0 },
    ],
    [direction],
  )

  const fromSnapshot = animationFrom ?? defaultFrom
  const toSnapshots = animationTo ?? defaultTo
  const animateKeyframes = useMemo(() => buildKeyframes(fromSnapshot, toSnapshots), [fromSnapshot, toSnapshots])
  const stepCount = toSnapshots.length + 1
  const totalDuration = stepDuration * (stepCount - 1)
  const times = Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)))

  return (
    <Tag ref={ref} aria-label={label} className={`flex flex-wrap ${className}`}>
      {words.map((w, index) => {
        const isLast = index === words.length - 1
        const gap = !isLast && !w.breakAfter ? ' ' : null
        const content = (
          <>
            {w.word}
            {gap}
          </>
        )
        const node = reduce ? (
          <span key={index} aria-hidden="true" className={w.className} style={{ display: 'inline-block' }}>
            {content}
          </span>
        ) : (
          <motion.span
            key={index}
            aria-hidden="true"
            className={w.className}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={{ duration: totalDuration, times, delay: (index * delay) / 1000, ease: easing } satisfies Transition}
            onAnimationComplete={isLast ? onAnimationComplete : undefined}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
          >
            {content}
          </motion.span>
        )
        return w.breakAfter ? [node, <span key={`br-${index}`} aria-hidden="true" className="basis-full h-0" />] : node
      })}
    </Tag>
  )
}
