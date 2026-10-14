import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Briefcase, Check, Home, MapPin } from 'lucide-react'
import { ApiError, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { usePincode } from '@/hooks/usePincode'
import { Field, FormBanner, PillButton, Spinner, inputClass, serverFieldErrors } from '@/components/auth/form'
import type { Address, AddressInput, AddressType } from '@/types'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient’s full name').max(80, 'That name is a little long'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number starting with 6–9'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'PIN codes are 6 digits'),
  city: z.string().trim().min(2, 'Enter the city').max(60, 'Keep it under 60 characters'),
  state: z.string().trim().min(2, 'Enter the state').max(60, 'Keep it under 60 characters'),
  line1: z.string().trim().min(3, 'House / flat number and building').max(120, 'Keep it under 120 characters'),
  line2: z.string().trim().max(120, 'Keep it under 120 characters'),
  landmark: z.string().trim().max(80, 'Keep it under 80 characters'),
  type: z.enum(['home', 'work', 'other']),
  isDefault: z.boolean(),
})
type Values = z.infer<typeof schema>
const FIELDS = Object.keys(schema.shape) as (keyof Values)[]

export const ADDRESS_TYPES: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
]

/** Normalises pasted numbers like "+91 98765 43210" or "098765 43210" to 10 digits. */
export function normalisePhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2)
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

function AutoChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
      <Check className="size-3" strokeWidth={3} aria-hidden="true" />Auto-filled
    </span>
  )
}

export interface AddressFormProps {
  initial?: Address | null
  /** No saved addresses yet: this one becomes the default automatically. */
  isFirst?: boolean
  submitLabel?: string
  onSubmit: (values: AddressInput) => Promise<void>
  onCancel?: () => void
  autoFocus?: boolean
}

export function AddressForm({ initial, isFirst, submitLabel = 'Save address', onSubmit, onCancel, autoFocus }: AddressFormProps) {
  const { register, handleSubmit, setValue, setError, control, getValues, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName: initial?.fullName ?? '',
      phone: initial?.phone ?? '',
      pincode: initial?.pincode ?? '',
      city: initial?.city ?? '',
      state: initial?.state ?? '',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? '',
      landmark: initial?.landmark ?? '',
      type: initial?.type ?? 'home',
      isDefault: initial?.isDefault ?? false,
    },
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [auto, setAuto] = useState<{ city: boolean; state: boolean }>({ city: false, state: false })
  const pin = useWatch({ control, name: 'pincode' })
  const { status: pinStatus, lookup } = usePincode()
  const lastPin = useRef(initial?.pincode ?? '')

  // Auto-fill city/state whenever a new, complete PIN is typed. Existing addresses aren't re-looked-up on open.
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pin ?? '') || pin === lastPin.current) return
    lastPin.current = pin
    let alive = true
    lookup(pin).then((place) => {
      if (!alive || !place || getValues('pincode') !== pin) return
      setValue('city', place.city, { shouldValidate: true, shouldDirty: true })
      setValue('state', place.state, { shouldValidate: true, shouldDirty: true })
      setAuto({ city: true, state: true })
    })
    return () => { alive = false }
  }, [pin, lookup, setValue, getValues])

  const phoneReg = register('phone')
  const pinReg = register('pincode')
  const cityReg = register('city')
  const stateReg = register('state')

  const submit = handleSubmit(async (v) => {
    setServerError(null)
    try {
      await onSubmit({
        fullName: v.fullName, phone: v.phone, pincode: v.pincode, city: v.city, state: v.state,
        line1: v.line1, line2: v.line2, landmark: v.landmark, type: v.type,
        // Only ever *set* default; the API keeps exactly one default.
        ...(v.isDefault && !initial?.isDefault ? { isDefault: true } : {}),
      })
    } catch (e) {
      const fields = serverFieldErrors(e)
      let mapped = false
      for (const [k, msg] of Object.entries(fields)) {
        if ((FIELDS as string[]).includes(k)) { setError(k as keyof Values, { message: msg }); mapped = true }
      }
      if (!mapped || !(e instanceof ApiError && e.status === 400)) setServerError(errorMessage(e, 'Couldn’t save this address. Try again?'))
    }
  })

  const pinHint =
    pinStatus === 'loading' ? <span className="inline-flex items-center gap-1.5"><Spinner className="size-3" />Finding your city…</span>
    : pinStatus === 'not_found' ? 'We couldn’t find this PIN. Fill in city and state yourself.'
    : pinStatus === 'unavailable' ? 'PIN lookup is offline. Enter city and state manually.'
    : undefined

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label={initial ? 'Edit address' : 'New address'}>
      <FormBanner show={!!serverError}>{serverError}</FormBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName?.message}>
          {(p) => <input {...p} {...register('fullName')} autoComplete="name" placeholder="Who’s receiving it?" className={inputClass} autoFocus={autoFocus} />}
        </Field>
        <Field label="Mobile number" error={errors.phone?.message}>
          {(p) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted tabular">+91</span>
              <input
                {...p}
                {...phoneReg}
                onChange={(e) => { e.target.value = normalisePhone(e.target.value); phoneReg.onChange(e) }}
                type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210"
                className={cn(inputClass, 'pl-12 tabular')}
              />
            </div>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="PIN code" error={errors.pincode?.message} hint={pinHint}>
          {(p) => (
            <input
              {...p}
              {...pinReg}
              onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); pinReg.onChange(e) }}
              inputMode="numeric" autoComplete="postal-code" placeholder="560001" maxLength={6}
              className={cn(inputClass, 'tabular tracking-[0.08em]')}
            />
          )}
        </Field>
        <Field label="City" error={errors.city?.message} aside={auto.city ? <AutoChip /> : null}>
          {(p) => <input {...p} {...cityReg} onChange={(e) => { setAuto((a) => ({ ...a, city: false })); cityReg.onChange(e) }} autoComplete="address-level2" placeholder="Bengaluru" className={inputClass} />}
        </Field>
        <Field label="State" error={errors.state?.message} aside={auto.state ? <AutoChip /> : null}>
          {(p) => <input {...p} {...stateReg} onChange={(e) => { setAuto((a) => ({ ...a, state: false })); stateReg.onChange(e) }} autoComplete="address-level1" placeholder="Karnataka" className={inputClass} />}
        </Field>
      </div>

      <Field label="House / flat, building" error={errors.line1?.message}>
        {(p) => <input {...p} {...register('line1')} autoComplete="address-line1" placeholder="Flat 4B, Sunbeam Apartments" className={inputClass} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Area, street" optional error={errors.line2?.message}>
          {(p) => <input {...p} {...register('line2')} autoComplete="address-line2" placeholder="12th Main, Indiranagar" className={inputClass} />}
        </Field>
        <Field label="Landmark" optional error={errors.landmark?.message}>
          {(p) => <input {...p} {...register('landmark')} placeholder="Opposite the bakery" className={inputClass} />}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-ink">Save as</legend>
        <div className="flex flex-wrap gap-2">
          {ADDRESS_TYPES.map(({ value, label, icon: Icon }) => (
            <label key={value} className="relative cursor-pointer">
              <input type="radio" value={value} {...register('type')} className="peer sr-only" />
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-muted transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface hover:text-ink">
                <Icon className="size-3.5" aria-hidden="true" />{label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {isFirst ? (
        <p className="text-[13px] text-muted">This will be your default address.</p>
      ) : initial?.isDefault ? (
        <p className="text-[13px] text-muted">This is your default address.</p>
      ) : (
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-ink">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} onBlur={field.onBlur} className="size-[18px] rounded-[5px] border-line bg-surface" />
              Make this my default address
            </label>
          )}
        />
      )}

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <PillButton type="submit" loading={isSubmitting} loadingText="Saving…" className="sm:min-w-44">{submitLabel}</PillButton>
        {onCancel ? <button type="button" onClick={onCancel} className="h-11 rounded-full px-5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink" disabled={isSubmitting}>Cancel</button> : null}
      </div>
    </form>
  )
}
