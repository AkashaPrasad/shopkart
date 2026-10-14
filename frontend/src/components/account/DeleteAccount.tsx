import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { toast } from 'sonner'
import { API_URL, ApiError, errorMessage, tokenStore } from '@/lib/api'
import { useAuth } from '@/store/auth'
import type { ApiErrorShape } from '@/types'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Field, PillButton, pill } from '@/components/auth/form'
import { PasswordInput } from '@/components/auth/PasswordInput'

/** DELETE /auth/me with a JSON body (the shared client's `del` has no body). Same auth conventions: cookie + Bearer. */
async function deleteAccount(password?: string) {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/me`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(password ? { password } : {}),
    })
  } catch {
    throw new ApiError(0, { code: 'NETWORK', message: 'Can’t reach ShopKart right now. Check your connection and try again.' })
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: ApiErrorShape } | null
    throw new ApiError(res.status, data?.error ?? { code: `HTTP_${res.status}`, message: 'Couldn’t delete your account.' })
  }
}

export function DeleteAccount() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const needsPassword = user?.hasPassword !== false

  const confirm = async () => {
    if (needsPassword && !password) { setError('Enter your password to confirm'); return }
    setPending(true)
    setError(null)
    try {
      await deleteAccount(needsPassword ? password : undefined)
      setOpen(false)
      navigate('/', { replace: true })
      await logout()
      toast('Your account has been deleted. Thanks for being here.')
    } catch (e) {
      const fieldMsg = e instanceof ApiError ? (e.details as { fields?: { password?: string } } | undefined)?.fields?.password : undefined
      setError(fieldMsg ?? (e instanceof ApiError && (e.status === 400 || e.status === 401) && needsPassword ? e.message || 'That password doesn’t match.' : errorMessage(e)))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-[20px] border border-danger/25 bg-surface p-5 sm:p-7">
      <h2 className="font-display text-[1.45rem] font-medium">Delete account</h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">Erases your profile, addresses, bag and wishlist. Past orders stay on record without your name, for tax and refund purposes.</p>
      <button type="button" onClick={() => { setOpen(true); setPassword(''); setError(null) }} className={pill('outline', 'md', 'mt-5 border-danger/30 text-danger hover:border-danger/60 hover:bg-danger/[0.06]')}>
        Delete my account…
      </button>

      <AlertDialog open={open} onOpenChange={(o) => { if (!pending) setOpen(o) }}>
        <AlertDialogContent className="rounded-[20px] border-line bg-surface p-6 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-medium">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed text-muted">
              This can’t be undone. You’ll be logged out, and {user?.email ? <span className="font-medium break-all text-ink">{user.email}</span> : 'this email'} will be free to register again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {needsPassword ? (
            <form onSubmit={(e) => { e.preventDefault(); void confirm() }} className="mt-1">
              <Field label="Your password" error={error ?? undefined}>
                {(p) => <PasswordInput {...p} value={password} onChange={(e) => { setPassword(e.target.value); setError(null) }} autoComplete="current-password" autoFocus />}
              </Field>
            </form>
          ) : error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogPrimitive.Cancel className={pill('ghost')} disabled={pending}>Keep my account</AlertDialogPrimitive.Cancel>
            <PillButton variant="danger" onClick={() => void confirm()} loading={pending} loadingText="Deleting…" disabled={needsPassword && !password}>Delete forever</PillButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
