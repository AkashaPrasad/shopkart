import type { ReactNode } from 'react'
import { Component, useEffect, useRef, useState } from 'react'
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import { toast } from 'sonner'
import { useTheme } from '@/store/theme'
import { cn } from '@/lib/utils'
import { Spinner } from './form'

/** Google failures (blocked script, unauthorised origin, GIS exceptions) must never take the form down. */
class GoogleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.warn('[google-signin] disabled:', error) }
  render() { return this.state.failed ? null : this.props.children }
}

function GoogleButtonInner({ onCredential, pending }: { onCredential: (credential: string) => void; pending?: boolean }) {
  const { scriptLoadedSuccessfully } = useGoogleOAuth()
  const theme = useTheme((s) => s.theme)
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // GIS needs a pixel width (max 400). Track the container so the button is truly full-width.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = Math.min(400, Math.floor(el.getBoundingClientRect().width))
      setWidth((prev) => (Math.abs(prev - w) > 6 ? w : prev))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ready = scriptLoadedSuccessfully && width > 0
  return (
    <div ref={ref} className="relative flex h-11 w-full items-center justify-center">
      {ready ? (
        <div className={cn('flex w-full justify-center transition-opacity', pending && 'pointer-events-none opacity-40')} aria-busy={pending || undefined}>
          <GoogleLogin
            key={`${theme}-${width}`}
            onSuccess={(r) => {
              if (r.credential) onCredential(r.credential)
              else toast.error('Google didn’t send back a sign-in. Try again or use your email.')
            }}
            onError={() => toast.error('Google sign-in didn’t go through. Try again or use your email.')}
            useOneTap={false}
            theme={theme === 'dark' ? 'filled_black' : 'outline'}
            shape="pill"
            size="large"
            text="continue_with"
            logo_alignment="center"
            width={width}
          />
        </div>
      ) : (
        <div className="h-10 w-full animate-pulse rounded-full border border-line bg-surface-2/60" aria-hidden="true" />
      )}
      {pending ? (
        <span className="absolute inset-0 grid place-items-center" role="status" aria-label="Signing in with Google">
          <Spinner className="size-5 text-ink" />
        </span>
      ) : null}
    </div>
  )
}

export function GoogleButton(props: { onCredential: (credential: string) => void; pending?: boolean }) {
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null
  return (
    <GoogleBoundary>
      <GoogleButtonInner {...props} />
    </GoogleBoundary>
  )
}
