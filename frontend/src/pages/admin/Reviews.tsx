import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { BadgeCheck, MessageSquareQuote, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteReview, useAdminReviews } from '@/hooks/useAdmin'
import { errorMessage } from '@/lib/api'
import { formatDate, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminReview } from '@/types'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { PillButton, pill } from '@/components/auth/form'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminThumb } from '@/components/admin/Bits'
import { CardList, CardSkeletons, Pagination, SkeletonRows, TableCard, THead, Td, Th, Tr } from '@/components/admin/DataTable'

const LIMIT = 20

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('size-3.5', i < rating ? 'fill-accent text-accent' : 'fill-transparent text-line')} aria-hidden="true" />
      ))}
    </span>
  )
}

function ProductCell({ r }: { r: AdminReview }) {
  if (!r.product) return <span className="text-[13px] text-muted">Deleted product</span>
  return (
    <span className="flex min-w-0 items-center gap-3">
      <AdminThumb src={r.product.image ?? r.product.images?.[0]} alt="" size="sm" />
      <Link to={`/product/${r.product.slug}`} target="_blank" rel="noopener" className="truncate text-[14px] font-medium text-ink hover:underline">{r.product.name}</Link>
    </span>
  )
}

function ReviewerCell({ r }: { r: AdminReview }) {
  return (
    <span className="block min-w-0">
      <span className="flex items-center gap-1.5 truncate text-[14px] font-medium text-ink">
        {r.user?.name || 'Deleted user'}
        {r.verified ? <BadgeCheck className="size-3.5 shrink-0 text-success" aria-label="Verified purchase" /> : null}
      </span>
      {r.user?.email ? <span className="block truncate text-[12.5px] text-muted">{r.user.email}</span> : null}
    </span>
  )
}

function ReviewText({ r, clamp = 2 }: { r: AdminReview; clamp?: 2 | 3 }) {
  return (
    <div className="min-w-0">
      {r.title ? <p className="truncate text-[14px] font-medium text-ink">{r.title}</p> : null}
      {r.body ? <p className={cn('text-[13px] leading-snug text-muted text-pretty', clamp === 2 ? 'line-clamp-2' : 'line-clamp-3')}>{r.body}</p> : null}
    </div>
  )
}

export default function Reviews() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, setData, status, error, refetch } = useAdminReviews({ page, limit: LIMIT })
  const [target, setTarget] = useState<AdminReview | null>(null)
  const [deleting, setDeleting] = useState(false)
  const busy = status === 'loading' && !!data

  const goPage = (p: number) => { setParams(p > 1 ? { page: String(p) } : {}); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const confirmDelete = async () => {
    if (!target) return
    setDeleting(true)
    try {
      await deleteReview(target._id)
      setData((d) => (d ? { ...d, items: d.items.filter((r) => r._id !== target._id), total: Math.max(0, d.total - 1) } : d))
      toast.success('Review deleted', { description: target.product ? `${target.product.name}’s rating has been recalculated.` : undefined })
      setTarget(null)
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t delete that review.'))
    } finally {
      setDeleting(false)
    }
  }

  const del = (r: AdminReview) => (
    <button type="button" onClick={() => setTarget(r)} className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-danger/[0.08] hover:text-danger" aria-label={`Delete review by ${r.user?.name ?? 'deleted user'}${r.product ? ` on ${r.product.name}` : ''}`}>
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  )

  return (
    <div>
      <Seo title="Reviews · Admin" />
      <AdminPageHeader title="Reviews" sub={data ? `${plural(data.total, 'review')}, newest first. Deleting one recalculates the product’s rating.` : 'What shoppers are saying, newest first.'} />

      {status === 'error' && !data ? (
        <ErrorState message={error ?? 'Couldn’t load reviews.'} onRetry={refetch} />
      ) : data && data.items.length === 0 ? (
        page > 1
          ? <EmptyState title="Nothing on this page" description="You’ve gone past the last page." action={<button type="button" onClick={() => goPage(1)} className={pill('ink')}>Back to page 1</button>} />
          : <EmptyState icon={<MessageSquareQuote className="size-6" />} title="No reviews yet" description="When shoppers review products, they’ll show up here." />
      ) : (
        <>
          <TableCard label="Reviews" busy={busy}>
            <THead>
              <Th>Product</Th>
              <Th>Reviewer</Th>
              <Th>Rating</Th>
              <Th>Review</Th>
              <Th>Date</Th>
              <Th><span className="sr-only">Actions</span></Th>
            </THead>
            <tbody>
              {!data ? <SkeletonRows cols={6} /> : data.items.map((r) => (
                <Tr key={r._id}>
                  <Td className="max-w-[240px]"><ProductCell r={r} /></Td>
                  <Td className="max-w-[200px]"><ReviewerCell r={r} /></Td>
                  <Td><Stars rating={r.rating} /></Td>
                  <Td className="max-w-[380px] min-w-[220px]"><ReviewText r={r} /></Td>
                  <Td className="whitespace-nowrap text-muted tabular">{formatDate(r.createdAt)}</Td>
                  <Td align="right">{del(r)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>

          {!data ? <CardSkeletons /> : (
            <CardList label="Reviews" busy={busy}>
              {data.items.map((r) => (
                <li key={r._id} className="rounded-[var(--radius)] border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <ProductCell r={r} />
                    {del(r)}
                  </div>
                  <div className="mt-3 flex items-center gap-2"><Stars rating={r.rating} /><span className="text-[12px] text-muted tabular">{formatDate(r.createdAt)}</span></div>
                  <div className="mt-2"><ReviewText r={r} clamp={3} /></div>
                  <div className="mt-3 border-t border-line pt-3"><ReviewerCell r={r} /></div>
                </li>
              ))}
            </CardList>
          )}

          {data ? <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} noun={['review', 'reviews']} onPage={goPage} /> : null}
        </>
      )}

      <AlertDialog open={!!target} onOpenChange={(o) => { if (!o && !deleting) setTarget(null) }}>
        <AlertDialogContent className="rounded-[20px] border-line bg-surface p-6 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-medium">Delete this review?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[15px] leading-relaxed text-muted">
                {target ? (
                  <>
                    <span className="mb-3 flex items-center gap-2"><Stars rating={target.rating} /><span className="text-[13px]">by {target.user?.name ?? 'deleted user'}</span></span>
                    {target.title ? <span className="block font-medium text-ink">“{target.title}”</span> : null}
                    <span className="mt-3 block">It disappears from {target.product?.name ?? 'the product page'} for good, and the average rating is recalculated. This can’t be undone.</span>
                  </>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogPrimitive.Cancel className={pill('ghost')} disabled={deleting}>Keep it</AlertDialogPrimitive.Cancel>
            <PillButton variant="danger" onClick={() => void confirmDelete()} loading={deleting} loadingText="Deleting…">Delete review</PillButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
