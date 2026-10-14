import { Link, useSearchParams } from 'react-router-dom'
import { SearchX, Users } from 'lucide-react'
import { useAdminCustomers } from '@/hooks/useAdmin'
import { formatDate, money, plural } from '@/lib/format'
import type { AdminCustomer } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { pill } from '@/components/auth/form'
import { Avatar } from '@/components/layout/MobileNav'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminSearch } from '@/components/admin/AdminSearch'
import { RoleBadge } from '@/components/admin/Bits'
import { CardList, CardSkeletons, Pagination, SkeletonRows, TableCard, THead, Td, Th, Tr } from '@/components/admin/DataTable'

const LIMIT = 20

function OrdersLink({ c }: { c: AdminCustomer }) {
  if (!c.ordersCount) return <span className="text-muted/70">0</span>
  return <Link to={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="font-medium text-ink underline-offset-2 hover:underline" aria-label={`${plural(c.ordersCount, 'order')} from ${c.name}`}>{c.ordersCount}</Link>
}

export default function Customers() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, status, error, refetch } = useAdminCustomers({ q, page, limit: LIMIT })
  const busy = status === 'loading' && !!data

  const setQ = (v: string) => setParams(v ? { q: v } : {}, { replace: true })
  const goPage = (p: number) => {
    setParams((prev) => { const n = new URLSearchParams(prev); p > 1 ? n.set('page', String(p)) : n.delete('page'); return n })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <Seo title="Customers · Admin" />
      <AdminPageHeader title="Customers" sub={data ? `${plural(data.total, 'account')}${q ? ' match' : ', newest first'}.` : 'Everyone with an account, newest first.'} />
      <AdminSearch value={q} onChange={setQ} label="Search customers" placeholder="Name or email" className="sm:max-w-sm" />

      <div className="mt-5">
        {status === 'error' && !data ? (
          <ErrorState message={error ?? 'Couldn’t load customers.'} onRetry={refetch} />
        ) : data && data.items.length === 0 ? (
          q ? (
            <EmptyState icon={<SearchX className="size-6" />} title="No one by that name" description={`No accounts match “${q}”.`} action={<button type="button" onClick={() => setParams({})} className={pill('outline')}>Clear search</button>} />
          ) : (
            <EmptyState icon={<Users className="size-6" />} title="No customers yet" description="Sign-ups will show up here." />
          )
        ) : (
          <>
            <TableCard label="Customers" busy={busy}>
              <THead>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th align="right">Orders</Th>
                <Th align="right">Spent</Th>
              </THead>
              <tbody>
                {!data ? <SkeletonRows cols={6} /> : data.items.map((c) => (
                  <Tr key={c._id}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <Avatar name={c.name} className="size-8" />
                        <span className="truncate font-medium text-ink">{c.name}</span>
                      </span>
                    </Td>
                    <Td className="max-w-[280px] truncate text-muted"><a href={`mailto:${c.email}`} className="hover:text-ink">{c.email}</a></Td>
                    <Td><RoleBadge role={c.role} /></Td>
                    <Td className="whitespace-nowrap text-muted tabular">{formatDate(c.createdAt)}</Td>
                    <Td align="right" className="tabular"><OrdersLink c={c} /></Td>
                    <Td align="right" className="font-medium text-ink tabular">{c.totalSpent ? money(c.totalSpent) : <span className="font-normal text-muted/70">—</span>}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>

            {!data ? <CardSkeletons /> : (
              <CardList label="Customers" busy={busy}>
                {data.items.map((c) => (
                  <li key={c._id} className="rounded-[var(--radius)] border border-line bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} className="size-9" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink">{c.name}</p>
                        <p className="truncate text-[12.5px] text-muted">{c.email}</p>
                      </div>
                      <RoleBadge role={c.role} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[13px]">
                      <div><dt className="text-muted">Joined</dt><dd className="mt-0.5 text-ink tabular">{formatDate(c.createdAt, { day: 'numeric', month: 'short', year: '2-digit' })}</dd></div>
                      <div><dt className="text-muted">Orders</dt><dd className="mt-0.5 tabular"><OrdersLink c={c} /></dd></div>
                      <div className="text-right"><dt className="text-muted">Spent</dt><dd className="mt-0.5 font-medium text-ink tabular">{money(c.totalSpent)}</dd></div>
                    </dl>
                  </li>
                ))}
              </CardList>
            )}

            {data ? <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} noun={['customer', 'customers']} onPage={goPage} /> : null}
          </>
        )}
      </div>
    </div>
  )
}
