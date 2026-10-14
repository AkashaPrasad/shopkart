import { motion, useReducedMotion } from 'motion/react'

/** Ink seal with a hand-drawn check and a quick tangerine "pop" — celebratory without confetti. */
export function SuccessMark({ size = 84 }: { size?: number }) {
  const reduce = useReducedMotion()
  const rays = Array.from({ length: 10 }, (_, i) => (i * 360) / 10)
  return (
    <div className="relative grid place-items-center" style={{ width: size * 1.7, height: size * 1.7 }} aria-hidden="true">
      {!reduce
        ? rays.map((deg, i) => (
            <motion.span
              key={deg}
              className="absolute h-[3px] rounded-full bg-accent"
              style={{ width: size * 0.16, rotate: deg, transformOrigin: 'center' }}
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: [0, 1, 0], x: [size * 0.42, size * 0.78] }}
              transition={{ delay: 0.55 + (i % 2) * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          ))
        : null}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 84 84"
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <circle cx="42" cy="42" r="40" fill="var(--ink)" />
        <motion.circle
          cx="42" cy="42" r="34" fill="none" stroke="var(--bg)" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="2 4"
          initial={reduce ? false : { rotate: -90 }} animate={{ rotate: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: '42px 42px' }}
        />
        <motion.path
          d="M27 43.5 L37.5 54 L58 31"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.22, duration: 0.42, ease: [0.65, 0, 0.35, 1] }}
        />
      </motion.svg>
    </div>
  )
}
