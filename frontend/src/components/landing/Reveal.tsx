import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { EASE } from './constants'
import { useFallbackTimer } from './useFallbackTimer'

const hasObserver = () => typeof window !== 'undefined' && 'IntersectionObserver' in window

/**
 * Scroll reveal that can never leave content invisible: no IntersectionObserver or reduced
 * motion renders it visible immediately, and a timer forces it visible after ~1s regardless.
 */
export function Reveal({ children, className, delay = 0, y = 18 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion()
  const forced = useFallbackTimer()

  if (reduce || !hasObserver()) return <div className={className}>{children}</div>

  const shown = { opacity: 1, y: 0 }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={shown}
      animate={forced ? shown : undefined}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
