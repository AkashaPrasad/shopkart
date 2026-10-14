import { useEffect } from 'react'
import { create } from 'zustand'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/store/auth'
import type { Address, AddressInput } from '@/types'

export const MAX_ADDRESSES = 10

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface AddressState {
  items: Address[]
  status: Status
  error: string | null
  load: (opts?: { silent?: boolean }) => Promise<void>
  create: (input: AddressInput) => Promise<Address>
  update: (id: string, input: Partial<AddressInput>) => Promise<Address>
  remove: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
}

/** Default first, then newest — the same order the picker and the account page show. */
function sortAddresses(items: Address[]) {
  return [...items].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || +new Date(b.createdAt) - +new Date(a.createdAt))
}

/** Trims strings. Empty line2/landmark are sent as '' — the API treats that as "clear this field". */
function clean<T extends Partial<AddressInput>>(input: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) if (v !== undefined) out[k] = typeof v === 'string' ? v.trim() : v
  return out as T
}

let inflight: Promise<void> | null = null

const useAddressStore = create<AddressState>((set, get) => ({
  items: [],
  status: 'idle',
  error: null,

  load({ silent } = {}) {
    if (inflight) return inflight
    if (!silent) set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null })
    inflight = (async () => {
      try {
        const { items } = await api.get<{ items: Address[] }>('/addresses')
        set({ items: sortAddresses(items), status: 'ready', error: null })
      } catch (e) {
        if (!silent || get().status !== 'ready') set({ status: 'error', error: errorMessage(e, 'Couldn’t load your addresses.') })
        throw e
      } finally {
        inflight = null
      }
    })()
    return inflight
  },

  async create(input) {
    const { address } = await api.post<{ address: Address }>('/addresses', clean(input))
    // The server may have flipped other defaults (first address / "make default"), so re-sync.
    set((s) => ({ items: sortAddresses([address, ...s.items.map((a) => (address.isDefault ? { ...a, isDefault: false } : a))]) }))
    get().load({ silent: true }).catch(() => {})
    return address
  },

  async update(id, input) {
    const { address } = await api.patch<{ address: Address }>(`/addresses/${id}`, clean(input))
    set((s) => ({ items: sortAddresses(s.items.map((a) => (a._id === id ? address : address.isDefault ? { ...a, isDefault: false } : a))) }))
    get().load({ silent: true }).catch(() => {})
    return address
  },

  async remove(id) {
    // Deleting the default promotes the most recent remaining one server-side; the response carries the new list.
    const r = await api.del<{ ok: boolean; items?: Address[] }>(`/addresses/${id}`)
    if (Array.isArray(r?.items)) set({ items: sortAddresses(r.items) })
    else {
      set((s) => ({ items: s.items.filter((a) => a._id !== id) }))
      await get().load({ silent: true }).catch(() => {})
    }
  },

  async setDefault(id) {
    const prev = get().items
    set({ items: sortAddresses(prev.map((a) => ({ ...a, isDefault: a._id === id }))) })
    try {
      await api.post(`/addresses/${id}/default`)
      get().load({ silent: true }).catch(() => {})
    } catch (e) {
      set({ items: prev })
      throw e
    }
  },
}))

// Never show one account's addresses to the next person who logs in on this device.
useAuth.subscribe((s, prev) => {
  if (s.user?._id !== prev.user?._id) useAddressStore.setState({ items: [], status: 'idle', error: null })
})

/** Shared, cached address book for checkout and the account area. Loads on first use. */
export function useAddresses() {
  const state = useAddressStore()
  const authed = useAuth((s) => !!s.user)
  useEffect(() => {
    if (authed && state.status === 'idle') state.load().catch(() => {})
  }, [authed, state.status, state])
  return state
}
