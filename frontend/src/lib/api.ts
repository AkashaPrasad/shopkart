import type { ApiErrorShape } from '@/types'

export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api'
const TOKEN_KEY = 'sk_token'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, body: ApiErrorShape) {
    super(body.message)
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ } },
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown, opts: { signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, { code: 'NETWORK', message: 'Can’t reach ShopKart right now. Check your connection and try again.' })
  }
  const text = await res.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!res.ok) {
    const err = (data as { error?: ApiErrorShape } | null)?.error ?? { code: 'HTTP_' + res.status, message: res.statusText || 'Something went wrong' }
    throw new ApiError(res.status, err)
  }
  return data as T
}

export const api = {
  get: <T>(p: string, o?: { signal?: AbortSignal }) => request<T>('GET', p, undefined, o),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {}),
  del: <T>(p: string) => request<T>('DELETE', p),
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof ApiError) return e.message || fallback
  if (e instanceof Error && e.name !== 'AbortError') return e.message || fallback
  return fallback
}
