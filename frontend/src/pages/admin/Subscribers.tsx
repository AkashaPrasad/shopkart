import { useSearchParams } from 'react-router-dom'
import { Check, Copy, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminSubscribers } from '@/hooks/useAdmin'
import { formatDate, plural } from '@/lib/format'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { pill } from '@/components/auth/form'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { CardList, CardSkeletons, Pagination, SkeletonRows, TableCard, THead, Td, Th, Tr } from '@/components/admin/DataTable'

const LIMIT = 50

export default function Subscribers() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, status, error, refetch } = useAdminSubscribers({ page, limit: LIMIT })
  const [copied, setCopied] = useState(false)
  const items = data?.items ?? []
  const total = data?.total ?? items.length
  const busy = status === 'loading' && !!data

  const copyAll = () => {
    navigator.clipboard?.writeText(items.map((s) => s.email).join(', '))
      .then(() => { setCopied(true); toast.success(`Copied ${plural(items.length, 'email')}`); setTimeout(() => setCopied(false), 1600) })
      .catch(() => toast.error('Couldn’t copy — your browser blocked clipboard access.'))
  }
  const goPage = (p: number) => { setParams(p > 1 ? { page: String(p) } : {}); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div>
      <Seo title="Subscribers · Admin" />
      <AdminPageHeader
        title="Subscribers"
        sub={data ? `${plural(total, 'person', 'people')} on the newsletter list.` : 'Everyone who signed up for the newsletter.'}
        actions={items.length ? <button type="button" onClick={copyAll} className={pill('outline', 'sm')}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}Copy {items.length === total ? 'all' : 'this page’s'} emails</button> : null}
      />

      {status === 'error' && !data ? (
        <ErrorState message={error ?? 'Couldn’t load subscribers.'} onRetry={refetch} />
      ) : data && items.length === 0 ? (
        <EmptyState icon={<Mail className="size-6" />} title="No subscribers yet" description="Newsletter sign-ups from the footer will appear here." />
      ) : (
        <>
          <TableCard label="Subscribers" busy={busy}>
            <THead>
              <Th>Email</Th>
              <Th>Source</Th>
              <Th align="right">Subscribed</Th>
            </THead>
            <tbody>
              {!data ? <SkeletonRows cols={3} /> : items.map((s) => (
                <Tr key={s._id}>
                  <Td className="font-medium text-ink"><a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a></Td>
                  <Td className="text-muted capitalize">{s.source || 'Newsletter'}</Td>
                  <Td align="right" className="whitespace-nowrap text-muted tabular">{formatDate(s.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>

          {!data ? <CardSkeletons /> : (
            <CardList label="Subscribers" busy={busy}>
              {items.map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3">
                  <a href={`mailto:${s.email}`} className="min-w-0 truncate text-[14px] font-medium text-ink">{s.email}</a>
                  <span className="shrink-0 text-[12.5px] text-muted tabular">{formatDate(s.createdAt, { day: 'numeric', month: 'short' })}</span>
                </li>
              ))}
            </CardList>
          )}

          {data?.pages && data.page ? <Pagination page={data.page} pages={data.pages} total={total} limit={LIMIT} noun={['subscriber', 'subscribers']} onPage={goPage} /> : null}
        </>
      )}
    </div>
  )
}
