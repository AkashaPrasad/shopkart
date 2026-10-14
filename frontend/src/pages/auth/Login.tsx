import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { ApiError, errorMessage } from '@/lib/api'
import { AuthCard, OrDivider } from '@/components/auth/AuthCard'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Field, FormBanner, PillButton, inputClass, firstName, safeNext, serverFieldErrors } from '@/components/auth/form'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').pipe(z.email('That email doesn’t look quite right')),
  password: z.string().min(1, 'Enter your password').min(8, 'Passwords here are at least 8 characters'),
})
type Values = z.input<typeof schema>

function loginErrorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 401 && e.code !== 'GOOGLE_ACCOUNT') return 'Email or password doesn’t match. Give it another go.'
    if (e.status === 429) return 'Too many attempts in a row. Take a breath and try again in a minute.'
  }
  return errorMessage(e)
}

export default function Login() {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const login = useAuth((s) => s.login)
  const google = useAuth((s) => s.google)
  const next = safeNext(params.get('next'))
  const nextQs = params.get('next') ? `?next=${encodeURIComponent(next)}` : ''
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? ''

  const [serverError, setServerError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: prefillEmail, password: '' },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null)
    try {
      const user = await login(email.trim(), password)
      toast.success(`Welcome back, ${firstName(user.name)}`)
      navigate(next, { replace: true })
    } catch (e) {
      const fields = serverFieldErrors(e)
      if (e instanceof ApiError && e.status === 400 && Object.keys(fields).length) {
        for (const [k, msg] of Object.entries(fields)) if (k === 'email' || k === 'password') setError(k, { message: msg })
      } else setServerError(loginErrorMessage(e))
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
      setServerError(errorMessage(e, 'Google sign-in didn’t go through. Try again or use your email.'))
    } finally {
      setGooglePending(false)
    }
  }

  const busy = isSubmitting || googlePending

  return (
    <AuthCard
      title={<>Welcome <em className="font-normal text-accent">back</em>.</>}
      subtitle={next === '/checkout' ? 'Log in to finish checking out — your bag is saved and waiting.' : 'Log in to check out, track orders and keep your bag in sync across devices.'}
      footer={<>New to ShopKart? <Link to={`/register${nextQs}`} className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">Create an account</Link></>}
    >
      <GoogleButton onCredential={onGoogle} pending={googlePending} />
      <OrDivider label="or with email" />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormBanner show={!!serverError}>{serverError}</FormBanner>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <input {...p} {...register('email')} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" className={inputClass} disabled={busy} />}
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          aside={<Link to="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password', { state: { email: getValues('email')?.trim() } }) }} className="text-[13px] font-medium text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">Forgot password?</Link>}
        >
          {(p) => <PasswordInput {...p} {...register('password')} autoComplete="current-password" placeholder="At least 8 characters" disabled={busy} />}
        </Field>
        <PillButton type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting} loadingText="Logging in…" disabled={googlePending}>
          Log in <ArrowRight className="size-4" />
        </PillButton>
      </form>
    </AuthCard>
  )
}
