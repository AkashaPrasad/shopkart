import { ArrowRight } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { AddressPicker } from '@/components/address/AddressPicker'
import { PillButton } from '@/components/auth/form'
import type { useAddresses } from '@/hooks/useAddresses'
import { StepHeading } from './StepHeading'

type Book = ReturnType<typeof useAddresses>

export function AddressStep({ book, value, onChange, onContinue }: { book: Book; value: string | null; onChange: (id: string) => void; onContinue: () => void }) {
  if (book.status === 'error' && book.items.length === 0) {
    return (
      <section>
        <StepHeading title="Where’s it going?" />
        <ErrorState message={book.error ?? 'Couldn’t load your addresses.'} onRetry={() => book.load().catch(() => {})} />
      </section>
    )
  }
  if (book.status !== 'ready' && book.items.length === 0) {
    return (
      <section aria-busy="true">
        <StepHeading title="Where’s it going?" sub="Pick a saved address or add a new one." />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-[168px] animate-pulse rounded-[var(--radius)] border border-line bg-surface-2/60" />)}
        </div>
      </section>
    )
  }
  const empty = book.items.length === 0
  return (
    <section>
      <StepHeading title="Where’s it going?" sub={empty ? 'Add a delivery address — it takes a few seconds.' : 'Pick a saved address or add a new one.'} />
      <AddressPicker
        addresses={book.items}
        value={value}
        onChange={onChange}
        onCreate={book.create}
        onUpdate={book.update}
        onDelete={book.remove}
      />
      {!empty ? (
        <div className="mt-7 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">You can change this again before paying.</p>
          <PillButton onClick={onContinue} disabled={!value} className="w-full sm:w-auto">
            Deliver here <ArrowRight className="size-4" />
          </PillButton>
        </div>
      ) : null}
    </section>
  )
}
