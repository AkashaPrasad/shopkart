import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MAX_ADDRESSES } from '@/hooks/useAddresses'
import { EASE } from '@/components/auth/form'
import type { Address, AddressInput } from '@/types'
import { AddressForm } from './AddressForm'
import { AddressLines, AddressTypeTag, cardActionClass } from './AddressCard'
import { DeleteAddressDialog } from './DeleteAddressDialog'

interface Props {
  addresses: Address[]
  value: string | null
  onChange: (id: string) => void
  onCreate: (input: AddressInput) => Promise<Address>
  onUpdate: (id: string, input: AddressInput) => Promise<Address>
  onDelete: (id: string) => Promise<void>
}

/** Radio-card address chooser with inline add / edit and confirmed delete. Native radios = arrow-key navigation for free. */
export function AddressPicker({ addresses, value, onChange, onCreate, onUpdate, onDelete }: Props) {
  const reduce = useReducedMotion()
  const [adding, setAdding] = useState(addresses.length === 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Address | null>(null)
  const atLimit = addresses.length >= MAX_ADDRESSES
  const showForm = adding || addresses.length === 0
  // Freeze "first address" copy while the form is open so labels don't flip as the list updates underneath it.
  const firstRef = useRef(addresses.length === 0)
  if (!showForm) firstRef.current = addresses.length === 0
  const first = firstRef.current

  const reveal = {
    initial: reduce ? false : { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: reduce ? { opacity: 0 } : { opacity: 0, height: 0 },
    transition: { duration: 0.28, ease: EASE },
  } as const

  return (
    <div className="flex flex-col gap-4">
      {addresses.length > 0 ? (
        <div role="radiogroup" aria-label="Delivery address" className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) =>
            editingId === a._id ? (
              <motion.div key={a._id} {...reveal} className="overflow-hidden sm:col-span-2">
                <div className="rounded-[var(--radius)] border border-ink/20 bg-surface p-4 sm:p-6">
                  <p className="mb-4 font-display text-xl">Edit address</p>
                  <AddressForm
                    initial={a}
                    autoFocus
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (v) => {
                      await onUpdate(a._id, v)
                      toast.success('Address updated')
                      setEditingId(null)
                      onChange(a._id)
                    }}
                  />
                </div>
              </motion.div>
            ) : (
              <label
                key={a._id}
                className={cn(
                  'group relative flex cursor-pointer flex-col rounded-[var(--radius)] border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-200 sm:p-5',
                  'border-line hover:border-ink/25',
                  'has-[input:checked]:border-ink has-[input:checked]:shadow-[0_0_0_1px_var(--ink)]',
                  'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-bg',
                )}
              >
                <input type="radio" name="checkout-address" value={a._id} checked={value === a._id} onChange={() => onChange(a._id)} className="peer sr-only" />
                <span aria-hidden="true" className="absolute top-4 right-4 grid size-5 place-items-center rounded-full border border-line bg-surface transition-colors peer-checked:border-ink peer-checked:bg-ink sm:top-5 sm:right-5">
                  <span className="size-2 rounded-full bg-bg opacity-0 transition-opacity group-has-[input:checked]:opacity-100" />
                </span>
                <AddressTypeTag type={a.type} isDefault={a.isDefault} />
                <AddressLines address={a} className="mt-3 pr-2" />
                <span className="mt-auto flex items-center gap-1 pt-3">
                  <button type="button" className={cn(cardActionClass, '-ml-3')} onClick={() => { setAdding(false); setEditingId(a._id) }} aria-label={`Edit address for ${a.fullName}`}>
                    <Pencil />Edit
                  </button>
                  <button type="button" className={cn(cardActionClass, 'hover:text-danger')} onClick={() => setDeleting(a)} aria-label={`Delete address for ${a.fullName}`}>
                    <Trash2 />Delete
                  </button>
                </span>
              </label>
            ),
          )}
          {!showForm && !atLimit && editingId === null ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-line bg-transparent p-5 text-sm font-medium text-muted transition-colors hover:border-ink/30 hover:bg-surface hover:text-ink"
            >
              <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-ink"><Plus className="size-4" /></span>
              Add a new address
            </button>
          ) : null}
        </div>
      ) : null}

      {atLimit && !editingId ? (
        <p className="text-[13px] text-muted">You’ve saved {MAX_ADDRESSES} addresses — that’s the limit. Delete one to add another.</p>
      ) : null}

      <AnimatePresence initial={false}>
        {showForm && !atLimit ? (
          <motion.div key="new" {...reveal} className="overflow-hidden">
            <div className={cn('rounded-[var(--radius)] border bg-surface p-4 sm:p-6', first ? 'border-line' : 'border-ink/20')}>
              <p className="font-display text-xl">{first ? 'Where should we send it?' : 'New address'}</p>
              <p className="mt-1 mb-5 text-sm text-muted">Type the PIN first — we’ll fill in the city and state.</p>
              <AddressForm
                isFirst={first}
                autoFocus={!first}
                submitLabel={first ? 'Save address' : 'Save and deliver here'}
                onCancel={first ? undefined : () => setAdding(false)}
                onSubmit={async (v) => {
                  const created = await onCreate(v)
                  toast.success('Address saved')
                  setAdding(false)
                  onChange(created._id)
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <DeleteAddressDialog
        address={deleting}
        others={addresses.length - 1}
        onOpenChange={(o) => { if (!o) setDeleting(null) }}
        onConfirm={(a) => onDelete(a._id)}
      />
    </div>
  )
}
