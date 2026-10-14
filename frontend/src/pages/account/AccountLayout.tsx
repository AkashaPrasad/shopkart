import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { LayoutGrid, LogOut, MapPin, Package, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/auth/form'

const NAV = [
  { to: '/account', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package, end: false },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin, end: false },
  { to: '/account/profile', label: 'Profile', icon: UserRound, end: false },
]

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S'
  return url ? (
    <img src={url} alt="" className="size-11 rounded-full border border-line object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid size-11 place-items-center rounded-full bg-ink font-display text-[15px] font-medium text-bg" aria-hidden="true">{initials}</span>
  )
}

export default function AccountLayout() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()

  const onLogout = async () => {
    navigate('/', { replace: true })
    await logout()
    toast('Logged out. See you soon.')
  }

  return (
    <div className="container-x py-6 sm:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-14">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {user ? (
            <div className="mb-6 hidden items-center gap-3 lg:flex">
              <Avatar name={user.name} url={user.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[13px] text-muted">{user.email}</p>
              </div>
            </div>
          ) : null}
          <nav aria-label="Account" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
            <ul className="flex w-max gap-1.5 pb-1 lg:w-auto lg:flex-col lg:gap-0.5 lg:pb-0">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <li key={to} className="shrink-0">
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => cn(
                      'flex h-10 items-center gap-2.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors lg:h-11 lg:rounded-xl lg:border-transparent lg:px-3.5',
                      isActive
                        ? 'border-ink bg-ink text-bg lg:border-line lg:bg-surface lg:text-ink lg:shadow-[var(--shadow-soft)]'
                        : 'border-line text-muted hover:text-ink lg:hover:bg-surface-2/70',
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="size-4" aria-hidden="true" />
                        {label}
                        {isActive ? <span className="ml-auto hidden size-1.5 rounded-full bg-accent lg:block" aria-hidden="true" /> : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
              <li className="shrink-0 lg:mt-3 lg:border-t lg:border-line lg:pt-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-10 items-center gap-2.5 rounded-full border border-line px-4 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-danger lg:h-11 lg:w-full lg:rounded-xl lg:border-transparent lg:px-3.5 lg:hover:bg-danger/[0.06]"
                >
                  <LogOut className="size-4" aria-hidden="true" />Log out
                </button>
              </li>
            </ul>
          </nav>
        </aside>
        <motion.div
          key={location.pathname}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="min-w-0"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
