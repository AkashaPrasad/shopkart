import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/shared/Logo'
import { CATEGORY_LIST } from '@/components/shop/categories'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import { money } from '@/lib/format'

const YEAR = new Date().getFullYear()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const id = useId()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) { setError('That email looks a little off.'); return }
    setPending(true)
    // Client-only for now: there is no newsletter endpoint yet.
    window.setTimeout(() => {
      setPending(false)
      setEmail('')
      toast.success('You’re on the list.', { description: 'One letter a month. Mostly stickers.' })
    }, 450)
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-sm">
      <label htmlFor={id} className="text-sm font-medium">Tiny letters</label>
      <p className="mt-1 text-sm text-muted">New drops and the odd discount. One email a month, never more.</p>
      <div className={`mt-4 flex h-12 items-center rounded-full border bg-surface pl-4 pr-1.5 transition-colors focus-within:border-ink ${error ? 'border-danger/60' : 'border-line'}`}>
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={e => { setEmail(e.target.value); if (error) setError(null) }}
          placeholder="you@example.com"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 disabled:opacity-60 active:scale-[0.98]">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Subscribe
        </button>
      </div>
      {error ? <p id={`${id}-err`} role="alert" className="mt-2 px-4 text-sm text-danger">{error}</p> : null}
    </form>
  )
}

const heading = 'font-sans text-xs font-medium uppercase tracking-[0.14em] text-muted'
const link = 'text-sm text-ink/80 transition-colors hover:text-ink'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-bg">
      <div className="container-x grid gap-12 py-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Link to="/" aria-label="ShopKart home" className="inline-block rounded-lg"><Logo /></Link>
          <p className="mt-4 font-display text-3xl leading-tight">
            Tiny things. <em className="italic text-accent">Big joy.</em>
          </p>
          <div className="mt-8"><Newsletter /></div>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
          <div>
            <h2 className={heading}>Shop by category</h2>
            <ul className="mt-4 space-y-2.5">
              {CATEGORY_LIST.map(c => (
                <li key={c.key}><Link to={`/shop?category=${c.key}`} className={link}>{c.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={heading}>Help</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/account/orders" className={link}>Track an order</Link></li>
              <li><Link to="/cart" className={link}>Your cart</Link></li>
              <li className="text-ink/80">Free shipping over {money(FREE_SHIPPING_THRESHOLD)}</li>
              <li className="text-ink/80">Ships within 24 hours</li>
              <li className="text-ink/80">7-day easy returns</li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <h2 className={heading}>Company</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/shop" className={`${link} inline-flex items-center gap-1`}>Everything <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>
              <li><Link to="/account" className={link}>Your account</Link></li>
              <li className="text-ink/80">Prices include all taxes</li>
            </ul>
            <p className={`${heading} mt-8`}>We accept</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Payment methods">
              {['UPI', 'Cards', 'Netbanking', 'Wallets'].map(m => (
                <li key={m} className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted">{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <span className="flex overflow-hidden rounded-[2px]" aria-hidden="true">
              <span className="h-2.5 w-1 bg-[#FF9933]" /><span className="h-2.5 w-1 bg-white ring-1 ring-inset ring-line" /><span className="h-2.5 w-1 bg-[#138808]" />
            </span>
            Made in India, one tiny parcel at a time. © {YEAR} ShopKart
          </p>
          <p className="tabular">
            <span className="font-medium text-ink">Small objects. Honest prices.</span> Payments secured by Razorpay.
          </p>
        </div>
      </div>
    </footer>
  )
}
