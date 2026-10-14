/**
 * CountUp — adapted from ReactBits (https://reactbits.dev/text-animations/count-up).
 * Changes for ShopKart: a timed tween on the brand easing instead of a long spring (keeps
 * motion under 600ms), en-IN grouping, prefix/suffix, and an instant final value when the
 * user prefers reduced motion. If the number never scrolls into view (full-page captures,
 * missing IntersectionObserver) it settles on the final value after `fallbackMs`.
 */
import { animate, useInView, useMotionValue, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface CountUpProps {
  to: number
  from?: number
  delay?: number
  duration?: number
  className?: string
  startWhen?: boolean
  separator?: boolean
  prefix?: string
  suffix?: string
  fallbackMs?: number
}

const EASE = [0.22, 1, 0.36, 1] as const

export default function CountUp({
  to,
  from = 0,
  delay = 0,
  duration = 0.6,
  className = '',
  startWhen = true,
  separator = true,
  prefix = '',
  suffix = '',
  fallbackMs = 1000,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const value = useMotionValue(from)
  const isInView = useInView(ref, { once: true, amount: 0.15 })
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), fallbackMs)
    return () => window.clearTimeout(id)
  }, [fallbackMs])

  const decimals = Math.max(...[from, to].map(n => (Number.isInteger(n) ? 0 : String(n).split('.')[1]?.length ?? 0)))
  const format = useCallback(
    (n: number) =>
      prefix +
      new Intl.NumberFormat('en-IN', { useGrouping: separator, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n) +
      suffix,
    [prefix, suffix, separator, decimals],
  )

  useEffect(() => {
    const unsubscribe = value.on('change', latest => {
      if (ref.current) ref.current.textContent = format(latest)
    })
    return unsubscribe
  }, [value, format])

  useEffect(() => {
    if (!startWhen) return
    const noObserver = typeof window !== 'undefined' && !('IntersectionObserver' in window)
    if (reduce || noObserver || (timedOut && !isInView)) {
      value.set(to)
      return
    }
    if (!isInView) return
    // Animates from wherever the value is now, so a late-arriving `to` glides instead of restarting.
    const controls = animate(value, to, { duration, delay, ease: EASE })
    return () => controls.stop()
  }, [isInView, timedOut, startWhen, reduce, to, duration, delay, value])

  return (
    <span className={className} ref={ref}>
      {format(reduce ? to : from)}
    </span>
  )
}
