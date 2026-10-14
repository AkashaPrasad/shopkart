import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Boxes, Inbox, LayoutDashboard, Mail, MessageSquareQuote, Package, TicketPercent, Undo2, Users } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/auth/form'

const NAV = [
  {
    group: 'Sales',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/orders', label: 'Orders', icon: Package, end: false },
      { to: '/admin/returns', label: 'Returns', icon: Undo2, end: false },
      { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, end: false },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products', icon: Boxes, end: false },
      { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote, end: false },
    ],
  },
  {
    group: 'People',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
      { to: '/admin/subscribers', label: 'Subscribers', icon: Mail, end: false },
      { to: '/admin/messages', label: 'Messages', icon: Inbox, end: false },
    ],
  },
]

const item = 'flex h-10 items-center gap-2.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors lg:h-11 lg:rounded-xl lg:border-transparent lg:px-3.5'

export default function AdminLayout() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const reduce = useReducedMotion()
  // Animate between sections, not between filter/page changes inside one.
  const section = location.pathname.split('/').slice(0, 3).join('/') + (location.pathname.split('/').length > 3 ? '/:id' : '')

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-6 hidden lg:block">
            <p className="flex items-center gap-2 font-display text-[1.45rem] leading-tight font-medium">Back office<span className="size-1.5 rounded-full bg-accent" aria-hidden="true" /></p>
            {user ? <p className="mt-1 truncate text-[13px] text-muted">Signed in as {user.name}</p> : null}
          </div>
          <nav aria-label="Admin" className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <ul className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
              {NAV.flatMap(({ group, items }, gi) => [
                <li key={group} className={cn('hidden px-3.5 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted/80 uppercase lg:block', gi > 0 && 'pt-4')} aria-hidden="true">{group}</li>,
                ...items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to} className="shrink-0">
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) => cn(
                        item,
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
                )),
              ])}
              <li className="shrink-0 lg:mt-3 lg:border-t lg:border-line lg:pt-3">
                <Link to="/" className={cn(item, 'border-line text-muted hover:text-ink lg:hover:bg-surface-2/70')}>
                  <ArrowLeft className="size-4" aria-hidden="true" />Back to store
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        <motion.div
          key={section}
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
