import { useEffect, useState } from 'react'

/** After this long, content is shown even if it never scrolled into view (full-page captures, odd embeds). */
export const REVEAL_FALLBACK_MS = 1000

/** True once `ms` have passed since mount. */
export function useFallbackTimer(ms = REVEAL_FALLBACK_MS) {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setElapsed(true), ms)
    return () => window.clearTimeout(id)
  }, [ms])
  return elapsed
}
