import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { pill } from '@/components/auth/form'
import { Seo } from '@/components/shared/Seo'

/** Calm 403 for signed-in shoppers who wander into /admin. */
export default function Forbidden() {
  const user = useAuth((s) => s.user)
  return (
    <div className="container-x flex min-h-[64vh] items-center justify-center py-16">
      <Seo title="Staff only" />
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-line bg-surface text-ink shadow-[var(--shadow-soft)]" aria-hidden="true">
          <Lock className="size-5" />
        </span>
        <p className="mt-6 text-[12px] font-semibold tracking-[0.16em] text-muted uppercase tabular">Error 403</p>
        <h1 className="mt-2 font-display text-[2.4rem] leading-[1.05] font-medium sm:text-[3rem]">
          Staff <em className="text-accent">only</em>, sorry.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted text-pretty">
          This corner of ShopKart is for the people packing the parcels.
          {user ? <> You’re signed in as <span className="font-medium text-ink">{user.email}</span>, which doesn’t have admin access.</> : null}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to="/shop" className={pill('ink')}>Back to the shop</Link>
          <Link to="/account" className={pill('outline')}>Your account</Link>
        </div>
      </div>
    </div>
  )
}
