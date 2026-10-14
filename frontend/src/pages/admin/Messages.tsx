import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Inbox, Reply } from 'lucide-react'
import { useAdminMessages } from '@/hooks/useAdmin'
import { formatDateTime, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminMessage } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { pill } from '@/components/auth/form'
import { Avatar } from '@/components/layout/MobileNav'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Pagination } from '@/components/admin/DataTable'

const LIMIT = 20

function MessageCard({ m }: { m: AdminMessage }) {
  const [open, setOpen] = useState(false)
  const long = m.message.length > 220
  const subject = m.subject?.trim() || 'No subject'
  const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`
  return (
    <li className="rounded-[20px] border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <Avatar name={m.name} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="truncate text-[15px] font-medium text-ink">{m.name}</p>
            <time dateTime={m.createdAt} className="text-[12px] text-muted tabular">{formatDateTime(m.createdAt)}</time>
          </div>
          <p className="truncate text-[12.5px] text-muted">{m.email}</p>
        </div>
      </div>
      <h2 className="mt-4 font-sans text-[15px] font-semibold text-ink">{subject}</h2>
      <p className={cn('mt-1.5 text-[14px] leading-relaxed whitespace-pre-line text-muted text-pretty', !open && long && 'line-clamp-3')}>{m.message}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={reply} className={pill('outline', 'sm')}><Reply className="size-3.5" />Reply by email</a>
        {long ? (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={pill('ghost', 'sm')}>
            {open ? 'Show less' : 'Read all'}<ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          </button>
        ) : null}
      </div>
    </li>
  )
}

export default function Messages() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, status, error, refetch } = useAdminMessages({ page, limit: LIMIT })
  const items = data?.items ?? []
  const total = data?.total ?? items.length
  const goPage = (p: number) => { setParams(p > 1 ? { page: String(p) } : {}); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div>
      <Seo title="Messages · Admin" />
      <AdminPageHeader title="Messages" sub={data ? `${plural(total, 'message')} from the contact form, newest first.` : 'Notes sent through the contact form.'} />

      {status === 'error' && !data ? (
        <ErrorState message={error ?? 'Couldn’t load messages.'} onRetry={refetch} />
      ) : !data ? (
        <ul className="grid gap-3 xl:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => <li key={i} className="h-52 animate-pulse rounded-[20px] border border-line bg-surface" />)}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title="Inbox zero" description="Messages from the contact page will land here." />
      ) : (
        <>
          <ul className={cn('grid gap-3 transition-opacity xl:grid-cols-2', status === 'loading' && 'opacity-60')}>
            {items.map((m) => <MessageCard key={m._id} m={m} />)}
          </ul>
          {data.pages && data.page ? <Pagination page={data.page} pages={data.pages} total={total} limit={LIMIT} noun={['message', 'messages']} onPage={goPage} /> : null}
        </>
      )}
    </div>
  )
}
