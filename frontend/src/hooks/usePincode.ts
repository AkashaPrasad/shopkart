import { useCallback, useRef, useState } from 'react'
import { api } from '@/lib/api'

export type PincodeStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'unavailable'
export interface PincodePlace { city: string; state: string }

const PIN_RE = /^[1-9]\d{5}$/
const cache = new Map<string, PincodePlace | null>()

/**
 * Looks up city/state for an Indian PIN via GET /addresses/pincode/:pin.
 * Stale responses (user kept typing) are ignored; results are cached per session.
 */
export function usePincode() {
  const [status, setStatus] = useState<PincodeStatus>('idle')
  const seq = useRef(0)

  const lookup = useCallback(async (pin: string): Promise<PincodePlace | null> => {
    const id = ++seq.current
    if (!PIN_RE.test(pin)) { setStatus('idle'); return null }
    if (cache.has(pin)) {
      const hit = cache.get(pin) ?? null
      setStatus(hit ? 'found' : 'not_found')
      return hit
    }
    setStatus('loading')
    try {
      const r = await api.get<{ city: string | null; state: string | null; valid: boolean }>(`/addresses/pincode/${pin}`)
      const place = r.valid && r.city && r.state ? { city: r.city, state: r.state } : null
      cache.set(pin, place)
      if (id !== seq.current) return null
      setStatus(place ? 'found' : 'not_found')
      return place
    } catch {
      if (id === seq.current) setStatus('unavailable')
      return null
    }
  }, [])

  const reset = useCallback(() => { seq.current++; setStatus('idle') }, [])
  return { status, lookup, reset }
}
