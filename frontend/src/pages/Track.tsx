import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, PackageSearch } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/utils'
import { PaperBackdrop } from '@/components/auth/AuthCard'
import { inputClass, pill } from '@/components/auth/form'

/** Accepts "sk-ab12cd", "AB12CD", "SK AB12CD" … → "SK-AB12CD". */
function normalise(raw: string) {
  const core = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^SK/, '')
  return core.length === 6 ? `SK-${core}` : null
}

export default function Track() {
  const user = useAuth((s) => s.user)
  const status = useAuth((s) => s.status)
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guestTarget, setGuestTarget] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const number = normalise(value)
    if (!number) { setError('Order numbers look like SK-7Q2M4X — six letters and numbers after “SK-”.'); return }
    setError(null)
    if (user) navigate(`/account/orders/${number}`)
    else setGuestTarget(number)
  }

  return (
    <section className="relative isolate">
      <PaperBackdrop />
      <div className="container-x flex min-h-[calc(100dvh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-[520px]">
          <span className="grid size-12 place-items-center rounded-full bg-ink text-bg"><PackageSearch className="size-5" aria-hidden="true" /></span>
          <h1 className="mt-6 font-display text-[2.4rem] leading-[1.04] font-medium sm:text-[3rem]">Track an <em className="font-normal text-accent">order</em>.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">Your order number is in your confirmation email and on the order page — it starts with SK-.</p>

          <form onSubmit={submit} noValidate className="mt-7">
            <label htmlFor="track-number" className="text-[13px] font-medium text-ink">Order number</label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <input
                id="track-number"
                value={value}
                onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); setGuestTarget(null) }}
                placeholder="SK-7Q2M4X"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={12}
                aria-invalid={!!error}
                aria-describedby={error ? 'track-err' : undefined}
                className={cn(inputClass, 'h-12 text-base tracking-[0.08em] tabular sm:flex-1')}
              />
              <button type="submit" className={pill('ink', 'lg')} disabled={status !== 'ready'}>Track <ArrowRight className="size-4" /></button>
            </div>
            {error ? <p id="track-err" role="alert" className="mt-2 text-[13px] text-danger">{error}</p> : null}
          </form>

          {guestTarget ? (
            <div className="mt-6 rounded-[var(--radius)] border border-line bg-surface p-5" role="status">
              <p className="font-medium text-ink">Log in to see <span className="tabular">{guestTarget}</span></p>
              <p className="mt-1 text-sm leading-relaxed text-muted">Orders are private to the account that placed them, so we’ll ask you to sign in first — then take you straight to its live timeline.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link to={`/login?next=${encodeURIComponent(`/account/orders/${guestTarget}`)}`} className={pill('ink')}><LogIn className="size-4" />Log in to track</Link>
                <Link to="/help" className={pill('ghost')}>Get help instead</Link>
              </div>
            </div>
          ) : user ? (
            <p className="mt-6 text-sm text-muted">Or browse <Link to="/account/orders" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">all your orders</Link>.</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
