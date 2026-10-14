import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { api, ApiError, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Field, FormBanner, PillButton, inputClass, serverFieldErrors } from '@/components/auth/form'
import { PasswordInput, PasswordMeter } from '@/components/auth/PasswordInput'
import { AccountHeading } from '@/components/account/AccountHeading'
import { normalisePhone } from '@/components/address/AddressForm'
import { DeleteAccount } from '@/components/account/DeleteAccount'
import type { User } from '@/types'

const detailsSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 letters, please').max(80, 'That name is a little long'),
  phone: z.string().trim().refine((v) => v === '' || /^[6-9]\d{9}$/.test(v), 'Enter a 10-digit mobile number starting with 6–9'),
})
type Details = z.infer<typeof detailsSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'Use at least 8 characters').max(128, 'Keep it under 128 characters'),
    confirm: z.string().min(1, 'Type the new password once more'),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords don’t match yet' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Pick something different from your current password' })
type Passwords = z.infer<typeof passwordSchema>

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-display text-[1.45rem] font-medium">{title}</h2>
      {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function DetailsForm({ user }: { user: User }) {
  const updateProfile = useAuth((s) => s.updateProfile)
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    mode: 'onTouched',
    defaultValues: { name: user.name, phone: user.phone ?? '' },
  })
  const phoneReg = register('phone')

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null)
    try {
      const u = await updateProfile({ name: v.name.trim(), phone: v.phone.trim() })
      reset({ name: u.name, phone: u.phone ?? '' })
      toast.success('Profile updated')
    } catch (e) {
      const f = serverFieldErrors(e)
      if (f.name) setError('name', { message: f.name })
      if (f.phone) setError('phone', { message: f.phone })
      if (!f.name && !f.phone) setServerError(errorMessage(e, 'Couldn’t save your details.'))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormBanner show={!!serverError}>{serverError}</FormBanner>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message}>
          {(p) => <input {...p} {...register('name')} autoComplete="name" className={inputClass} />}
        </Field>
        <Field label="Mobile number" optional error={errors.phone?.message} hint="Used to prefill payments and deliveries.">
          {(p) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted tabular">+91</span>
              <input {...p} {...phoneReg} onChange={(e) => { e.target.value = normalisePhone(e.target.value); phoneReg.onChange(e) }} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" className={cn(inputClass, 'pl-12 tabular')} />
            </div>
          )}
        </Field>
      </div>
      <Field label="Email" hint={user.hasPassword === false ? 'Signed in with Google. Email can’t be changed here.' : 'Your login. It can’t be changed here.'}>
        {(p) => <input {...p} value={user.email} readOnly className={inputClass} />}
      </Field>
      <div className="flex items-center gap-3 pt-1">
        <PillButton type="submit" loading={isSubmitting} loadingText="Saving…" disabled={!isDirty}>Save changes</PillButton>
        {isDirty && !isSubmitting ? <button type="button" onClick={() => reset()} className="h-11 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink">Discard</button> : null}
      </div>
    </form>
  )
}

function PasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, reset, setError, control, formState: { errors, isSubmitting } } = useForm<Passwords>({
    resolver: zodResolver(passwordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  })
  const pw = useWatch({ control, name: 'newPassword' }) ?? ''

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null)
    try {
      await api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword })
      reset()
      toast.success('Password changed')
    } catch (e) {
      const f = serverFieldErrors(e)
      if (f.currentPassword) setError('currentPassword', { message: f.currentPassword })
      else if (f.newPassword) setError('newPassword', { message: f.newPassword })
      else setServerError(e instanceof ApiError && e.status === 429 ? 'Too many attempts. Try again in a minute.' : errorMessage(e, 'Couldn’t change your password.'))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormBanner show={!!serverError}>{serverError}</FormBanner>
      <Field label="Current password" error={errors.currentPassword?.message}>
        {(p) => <PasswordInput {...p} {...register('currentPassword')} autoComplete="current-password" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" error={errors.newPassword?.message} hint={pw ? <PasswordMeter value={pw} /> : 'At least 8 characters.'}>
          {(p) => <PasswordInput {...p} {...register('newPassword')} autoComplete="new-password" />}
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          {(p) => <PasswordInput {...p} {...register('confirm')} autoComplete="new-password" />}
        </Field>
      </div>
      <div className="pt-1"><PillButton type="submit" loading={isSubmitting} loadingText="Updating…">Update password</PillButton></div>
    </form>
  )
}

export default function Profile() {
  const user = useAuth((s) => s.user)
  if (!user) return null
  return (
    <div className="flex flex-col gap-4">
      <AccountHeading title="Profile" sub={`Member since ${new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.`} />
      <Panel title="Your details"><DetailsForm key={user._id} user={user} /></Panel>
      <Panel title="Password" sub={user.hasPassword === false ? undefined : 'Use something you don’t use anywhere else.'}>
        {user.hasPassword === false ? (
          <div className="flex gap-3 rounded-xl border border-line bg-surface-2/60 px-4 py-3.5 text-sm">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="text-muted">You sign in with Google, so there’s no ShopKart password to change. Your Google account’s security settings cover you.</p>
          </div>
        ) : (
          <PasswordForm />
        )}
      </Panel>
      <DeleteAccount />
    </div>
  )
}
