import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { api, ApiError, errorMessage } from '@/lib/api'
import { AuthCard } from '@/components/auth/AuthCard'
import { PasswordInput, PasswordMeter } from '@/components/auth/PasswordInput'
import { Field, FormBanner, PillButton, pill, serverFieldErrors } from '@/components/auth/form'

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters').max(128, 'Keep it under 128 characters'),
    confirm: z.string().min(1, 'Type it once more'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match yet' })
type Values = z.input<typeof schema>

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [error, setError] = useState<{ text: string; expired: boolean } | null>(null)
  const { register, handleSubmit, setError: setFieldError, control, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { password: '', confirm: '' },
  })
  const pw = useWatch({ control, name: 'password' }) ?? ''

  if (!token) {
    return (
      <AuthCard title={<>That link looks <em className="font-normal text-accent">incomplete</em>.</>} subtitle="Reset links carry a one-time code. Open the full link from your email, or request a new one.">
        <Link to="/forgot-password" className={pill('ink', 'lg', 'w-full')}>Send me a new link</Link>
      </AuthCard>
    )
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password updated — log in with your new one')
      navigate('/login', { replace: true })
    } catch (e) {
      const f = serverFieldErrors(e)
      if (f.password) { setFieldError('password', { message: f.password }); return }
      const expired = e instanceof ApiError && (e.code === 'INVALID_TOKEN' || e.status === 400)
      setError({ text: expired ? 'This reset link has expired or was already used.' : errorMessage(e), expired })
    }
  })

  return (
    <AuthCard title={<>Set a new <em className="font-normal text-accent">password</em>.</>} subtitle="Make it something you haven’t used here before." footer={<Link to="/login" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">Back to log in</Link>}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormBanner
          show={!!error}
          action={error?.expired ? <Link to="/forgot-password" className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">Request a new link <ArrowRight className="size-3.5" /></Link> : undefined}
        >{error?.text}</FormBanner>
        <Field label="New password" error={errors.password?.message} hint={pw ? <PasswordMeter value={pw} /> : 'At least 8 characters.'}>
          {(p) => <PasswordInput {...p} {...register('password')} autoComplete="new-password" autoFocus />}
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          {(p) => <PasswordInput {...p} {...register('confirm')} autoComplete="new-password" />}
        </Field>
        <PillButton type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting} loadingText="Saving…">Update password</PillButton>
      </form>
    </AuthCard>
  )
}
