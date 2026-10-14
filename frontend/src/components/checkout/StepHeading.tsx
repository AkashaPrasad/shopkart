import { useEffect, useRef } from 'react'

/** Step title that takes focus when the step changes, so keyboard users land in the right place. */
export function StepHeading({ title, sub, focusOnMount = true }: { title: string; sub?: string; focusOnMount?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    // Skip the very first page load (focus would jump past the header); focus on step transitions.
    if (focusOnMount && document.activeElement && document.activeElement !== document.body) ref.current?.focus({ preventScroll: true })
  }, [focusOnMount])
  return (
    <div className="mb-5">
      <h2 ref={ref} tabIndex={-1} className="font-display text-[1.65rem] leading-tight font-medium outline-none sm:text-3xl">{title}</h2>
      {sub ? <p className="mt-1.5 text-[15px] text-muted">{sub}</p> : null}
    </div>
  )
}
