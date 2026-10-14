import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { api, ApiError, errorMessage } from '@/lib/api'
import { AuthCard } from '@/components/auth/AuthCard'
import { Field, FormBanner, PillButton, inputClass } from '@/components/auth/form'

const schema = z.object({ email: z.string().trim().min(1, 'Enter your email').pipe(z.email('That email doesn’t look quite right')) })
type Values = z.input<typeof schema>

export default function ForgotPassword() {
  const location = useLocation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: (location.state as { email?: string } | null)?.email ?? '' },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSentTo(email.trim())
    } catch (e) {
      setServerError(e instanceof ApiError && e.status === 429 ? 'Too many requests. Try again in a minute.' : errorMessage(e))
    }
  })

  const back = <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"><ArrowLeft className="size-3.5" />Back to log in</Link>

  if (sentTo) {
    return (
      <AuthCard title={<>Check your <em className="font-normal text-accent">inbox</em>.</>} footer={back}>
        <div className="flex gap-3 rounded-xl border border-line bg-surface-2/60 px-4 py-4 text-[15px] leading-relaxed" role="status">
          <MailCheck className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" />
          <p className="text-muted">If an account exists for <span className="font-medium break-all text-ink">{sentTo}</span>, a reset link is on its way. It works once and expires in 30 minutes.</p>
        </div>
        <p className="mt-5 text-[13px] text-muted">Nothing after a few minutes? Check spam, or <button type="button" onClick={() => setSentTo(null)} className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">try another email</button>.</p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={<>Forgot your <em className="font-normal text-accent">password</em>?</>} subtitle="Happens to the best of us. Enter your email and we’ll send a link to set a new one." footer={back}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormBanner show={!!serverError}>{serverError}</FormBanner>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <input {...p} {...register('email')} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" className={inputClass} autoFocus />}
        </Field>
        <PillButton type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting} loadingText="Sending…">Send reset link</PillButton>
      </form>
    </AuthCard>
  )
}
