import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { ApiError, errorMessage } from '@/lib/api'
import { AuthCard, OrDivider } from '@/components/auth/AuthCard'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { PasswordInput, PasswordMeter } from '@/components/auth/PasswordInput'
import { Field, FormBanner, PillButton, inputClass, firstName, safeNext, serverFieldErrors } from '@/components/auth/form'

const schema = z
  .object({
    name: z.string().trim().min(2, 'Tell us at least 2 letters of your name').max(80, 'That name is a little long'),
    email: z.string().trim().min(1, 'Enter your email').pipe(z.email('That email doesn’t look quite right')),
    password: z.string().min(8, 'Use at least 8 characters').max(128, 'Keep it under 128 characters'),
    confirm: z.string().min(1, 'Type your password once more'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match yet' })
type Values = z.input<typeof schema>

type ServerError = { kind: 'taken'; google: boolean; email: string } | { kind: 'message'; text: string }

export default function Register() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const registerUser = useAuth((s) => s.register)
  const google = useAuth((s) => s.google)
  const next = safeNext(params.get('next'))
  const nextQs = params.get('next') ? `?next=${encodeURIComponent(next)}` : ''

  const [serverError, setServerError] = useState<ServerError | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const { register, handleSubmit, setError, control, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  })
  const password = useWatch({ control, name: 'password' }) ?? ''

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null)
    try {
      const user = await registerUser(name.trim(), email.trim(), password)
      toast.success(`Welcome to ShopKart, ${firstName(user.name)}`)
      navigate(next, { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setServerError({ kind: 'taken', google: /google/i.test(e.message), email: email.trim() })
        return
      }
      const fields = serverFieldErrors(e)
      if (e instanceof ApiError && e.status === 400 && Object.keys(fields).length) {
        for (const [k, msg] of Object.entries(fields)) if (k === 'name' || k === 'email' || k === 'password') setError(k, { message: msg })
        return
      }
      setServerError({ kind: 'message', text: e instanceof ApiError && e.status === 429 ? 'Too many attempts in a row. Try again in a minute.' : errorMessage(e) })
    }
  })

  const onGoogle = async (credential: string) => {
    setServerError(null)
    setGooglePending(true)
    try {
      const user = await google(credential)
      toast.success(`Welcome back, ${firstName(user.name)}`)
      navigate(next, { replace: true })
    } catch (e) {
      setServerError({ kind: 'message', text: errorMessage(e, 'Google sign-in didn’t go through. Try again or use your email.') })
    } finally {
      setGooglePending(false)
    }
  }

  const busy = isSubmitting || googlePending

  return (
    <AuthCard
      title={<>Join the <em className="font-normal text-accent">tiny</em> club.</>}
      subtitle="One account for checkout, order tracking and saved addresses. Takes about twenty seconds."
      footer={<>Already have an account? <Link to={`/login${nextQs}`} className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">Log in</Link></>}
    >
      <GoogleButton onCredential={onGoogle} pending={googlePending} />
      <OrDivider label="or with email" />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormBanner
          show={!!serverError}
          title={serverError?.kind === 'taken' ? 'That email already has an account.' : undefined}
          action={serverError?.kind === 'taken' ? (
            <Link to={`/login${nextQs}`} state={{ email: serverError.email }} className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
              Log in instead <ArrowRight className="size-3.5" />
            </Link>
          ) : undefined}
        >
          {serverError?.kind === 'taken'
            ? (serverError.google ? 'It signs in with Google — use “Continue with Google” above.' : 'Log in with it and your bag comes along.')
            : serverError?.text}
        </FormBanner>

        <Field label="Your name" error={errors.name?.message}>
          {(p) => <input {...p} {...register('name')} autoComplete="name" placeholder="Asha Rao" className={inputClass} disabled={busy} />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <input {...p} {...register('email')} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" className={inputClass} disabled={busy} />}
        </Field>
        <Field label="Password" error={errors.password?.message} hint={password ? <PasswordMeter value={password} /> : 'At least 8 characters. A short phrase works well.'}>
          {(p) => <PasswordInput {...p} {...register('password')} autoComplete="new-password" placeholder="Create a password" disabled={busy} />}
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          {(p) => <PasswordInput {...p} {...register('confirm')} autoComplete="new-password" placeholder="Same again" disabled={busy} />}
        </Field>
        <PillButton type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting} loadingText="Creating your account…" disabled={googlePending}>
          Create account <ArrowRight className="size-4" />
        </PillButton>
      </form>
    </AuthCard>
  )
}
