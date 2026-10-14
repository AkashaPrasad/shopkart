import { useState } from 'react'
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { useAddresses, MAX_ADDRESSES } from '@/hooks/useAddresses'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PillButton, Spinner } from '@/components/auth/form'
import { AccountHeading } from '@/components/account/AccountHeading'
import { AddressCard, cardActionClass } from '@/components/address/AddressCard'
import { AddressForm } from '@/components/address/AddressForm'
import { DeleteAddressDialog } from '@/components/address/DeleteAddressDialog'
import type { Address } from '@/types'

export default function Addresses() {
  const book = useAddresses()
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Address | null>(null)
  const [defaulting, setDefaulting] = useState<string | null>(null)
  const atLimit = book.items.length >= MAX_ADDRESSES

  const makeDefault = async (a: Address) => {
    setDefaulting(a._id)
    try {
      await book.setDefault(a._id)
      toast.success(`${a.type === 'home' ? 'Home' : a.type === 'work' ? 'Work' : 'That'} address is now your default`)
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t change your default address.'))
    } finally {
      setDefaulting(null)
    }
  }

  const addButton = (
    <PillButton onClick={() => setEditing('new')} disabled={atLimit || book.status !== 'ready'}>
      <Plus className="size-4" />Add address
    </PillButton>
  )

  return (
    <div>
      <AccountHeading
        title="Addresses"
        sub={atLimit ? `You’ve saved the maximum of ${MAX_ADDRESSES}. Delete one to add another.` : 'Where your tiny things land. Your default is picked first at checkout.'}
        action={book.items.length ? addButton : undefined}
      />

      {book.status === 'error' && !book.items.length ? (
        <ErrorState message={book.error ?? 'Couldn’t load your addresses.'} onRetry={() => book.load().catch(() => {})} />
      ) : book.status !== 'ready' && !book.items.length ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-[196px] animate-pulse rounded-[var(--radius)] bg-surface-2/70" />)}</div>
      ) : book.items.length === 0 ? (
        <EmptyState icon={<MapPin className="size-6" />} title="No addresses yet" description="Save one now and checkout is down to a single tap." action={addButton} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {book.items.map((a) => (
            <li key={a._id}>
              <AddressCard
                address={a}
                className={a.isDefault ? 'border-ink/25' : undefined}
                actions={<>
                  <button type="button" className={`${cardActionClass} -ml-3`} onClick={() => setEditing(a)} aria-label={`Edit address for ${a.fullName}`}><Pencil />Edit</button>
                  <button type="button" className={`${cardActionClass} hover:text-danger`} onClick={() => setDeleting(a)} aria-label={`Delete address for ${a.fullName}`}><Trash2 />Delete</button>
                  {!a.isDefault ? (
                    <button type="button" className={`${cardActionClass} ml-auto`} onClick={() => makeDefault(a)} disabled={defaulting !== null}>
                      {defaulting === a._id ? <Spinner /> : <Star />}Set as default
                    </button>
                  ) : null}
                </>}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="gap-0 rounded-[22px] border-line bg-surface p-0 sm:max-w-[640px]">
          <div className="max-h-[88dvh] overflow-y-auto p-5 sm:p-7">
            <DialogHeader className="mb-5 text-left">
              <DialogTitle className="font-display text-[1.6rem] font-medium">{editing === 'new' ? 'New address' : 'Edit address'}</DialogTitle>
              <DialogDescription className="text-[14px] text-muted">{editing === 'new' ? 'Type the PIN first — we’ll fill in the city and state.' : 'Changes apply to future orders. Past orders keep their original address.'}</DialogDescription>
            </DialogHeader>
            {editing !== null ? (
              <AddressForm
                key={editing === 'new' ? 'new' : editing._id}
                initial={editing === 'new' ? null : editing}
                isFirst={editing === 'new' && book.items.length === 0}
                autoFocus
                onCancel={() => setEditing(null)}
                onSubmit={async (v) => {
                  if (editing === 'new') { await book.create(v); toast.success('Address saved') }
                  else { await book.update(editing._id, v); toast.success('Address updated') }
                  setEditing(null)
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteAddressDialog
        address={deleting}
        others={book.items.length - 1}
        onOpenChange={(o) => { if (!o) setDeleting(null) }}
        onConfirm={(a) => book.remove(a._id)}
      />
    </div>
  )
}
