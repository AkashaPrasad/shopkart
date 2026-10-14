import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Gift, MessageSquareText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE, inputClass } from '@/components/auth/form'

export const NOTE_MAX = 200

function NoteField({ label, hint, icon: Icon, value, onChange, placeholder, disabled }: {
  label: string; hint: string; icon: typeof Gift; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(!!value)
  const left = NOTE_MAX - value.length
  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="inline-flex h-9 items-center gap-2 rounded-full border border-dashed border-line px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface-2 disabled:opacity-50">
          <Icon className="size-3.5" aria-hidden="true" />{label}
        </button>
      ) : null}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={id} className="inline-flex items-center gap-2 text-[13px] font-medium text-ink"><Icon className="size-3.5 text-muted" aria-hidden="true" />{label}</label>
              <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label={`Remove ${label.toLowerCase()}`}>
                <X className="size-3.5" />
              </button>
            </div>
            <textarea
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, NOTE_MAX))}
              maxLength={NOTE_MAX}
              rows={2}
              autoFocus={!value}
              disabled={disabled}
              placeholder={placeholder}
              aria-describedby={`${id}-count`}
              className={cn(inputClass, 'mt-1.5 h-auto min-h-[72px] resize-none py-2.5 leading-relaxed')}
            />
            <div className="mt-1 flex justify-between gap-3 text-[12px] text-muted">
              <span>{hint}</span>
              <span id={`${id}-count`} className={cn('shrink-0 tabular', left <= 20 && 'text-warning')} aria-live="polite">{value.length}/{NOTE_MAX}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/** Optional delivery instructions + gift message (≤200 chars each). */
export function OrderNotes({ deliveryNote, giftMessage, onChange, disabled }: {
  deliveryNote: string; giftMessage: string; onChange: (patch: { deliveryNote?: string; giftMessage?: string }) => void; disabled?: boolean
}) {
  return (
    <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5">
      <p className="mb-3 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">Anything else? <span className="font-normal tracking-normal normal-case">Optional</span></p>
      <div className="flex flex-col gap-3">
        <NoteField label="Delivery instructions" icon={MessageSquareText} hint="For the courier — gate codes, landmarks, timings." placeholder="Ring the bell twice; leave with the security desk if I’m out." value={deliveryNote} onChange={(v) => onChange({ deliveryNote: v })} disabled={disabled} />
        <NoteField label="Gift message" icon={Gift} hint="Sending it to someone? We’ll include your note with the order." placeholder="Tiny things for a big birthday. Love, A." value={giftMessage} onChange={(v) => onChange({ giftMessage: v })} disabled={disabled} />
      </div>
    </div>
  )
}
