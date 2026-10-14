import { create } from 'zustand'
import { api, tokenStore } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  status: 'idle' | 'loading' | 'ready'
  bootstrap: () => Promise<void>
  setSession: (user: User, token: string) => void
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  google: (credential: string) => Promise<User>
  logout: () => Promise<void>
  updateProfile: (patch: { name?: string; phone?: string }) => Promise<User>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  async bootstrap() {
    if (get().status !== 'idle') return
    set({ status: 'loading' })
    try {
      const { user } = await api.get<{ user: User }>('/auth/me')
      set({ user, status: 'ready' })
    } catch {
      tokenStore.set(null)
      set({ user: null, status: 'ready' })
    }
  },
  setSession(user, token) {
    tokenStore.set(token)
    set({ user, status: 'ready' })
  },
  async login(email, password) {
    const r = await api.post<{ user: User; token: string }>('/auth/login', { email, password })
    get().setSession(r.user, r.token)
    return r.user
  },
  async register(name, email, password) {
    const r = await api.post<{ user: User; token: string }>('/auth/register', { name, email, password })
    get().setSession(r.user, r.token)
    return r.user
  },
  async google(credential) {
    const r = await api.post<{ user: User; token: string }>('/auth/google', { credential })
    get().setSession(r.user, r.token)
    return r.user
  },
  async logout() {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    tokenStore.set(null)
    set({ user: null })
  },
  async updateProfile(patch) {
    const { user } = await api.patch<{ user: User }>('/auth/me', patch)
    set({ user })
    return user
  },
}))
