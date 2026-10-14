import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import { Spinner } from '@/components/auth/form'
import { LOW_STOCK } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'

const MAX_STOCK = 99999

function parseStock(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw.trim())
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_STOCK ? n : null
}

/**
 * Inline stock field. Type, then Enter (or Save) to commit; Esc reverts.
 * `onSave` resolves `true` on success; on `false` the typed value is kept so it can be retried.
 */
export function StockEditor({ value, productName, onSave }: { value: number; productName: string; onSave: (n: number) => Promise<boolean> }) {
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()

  // Follow server/optimistic changes to `value` unless the user is mid-edit.
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    if (!saving && draft === String(synced)) setDraft(String(value))
  }

  const parsed = parseStock(draft)
  const dirty = draft.trim() !== String(value)
  const invalid = draft.trim() !== '' && parsed === null

  const save = async () => {
    if (!dirty || parsed === null || saving) return
    setSaving(true)
    setFailed(false)
    const ok = await onSave(parsed)
    setSaving(false)
    if (ok) setDraft(String(parsed))
    else { setDraft(String(parsed)); setFailed(true); inputRef.current?.focus() }
  }
  const cancel = () => { setDraft(String(value)); setFailed(false) }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); void save() }
    else if (e.key === 'Escape' && dirty) { e.preventDefault(); e.stopPropagation(); cancel() }
  }

  const tone = value === 0 ? 'danger' : value <= LOW_STOCK ? 'warning' : null
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        {tone && !dirty ? <span className={cn('absolute top-1/2 left-2.5 size-1.5 -translate-y-1/2 rounded-full', tone === 'danger' ? 'bg-danger' : 'bg-warning')} aria-hidden="true" /> : null}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => { setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 5)); setFailed(false) }}
          onKeyDown={onKeyDown}
          onFocus={(e) => e.currentTarget.select()}
          disabled={saving}
          aria-label={`Stock for ${productName}`}
          aria-invalid={invalid || failed}
          aria-describedby={hintId}
          className={cn(
            'h-9 w-[76px] rounded-lg border bg-surface pr-2.5 pl-5 text-right text-sm font-medium text-ink tabular outline-none transition-[border-color,box-shadow]',
            'border-line hover:border-ink/30 focus:border-ink focus:ring-[3px] focus:ring-ink/[0.07] disabled:opacity-60',
            dirty && 'border-accent/70 focus:border-accent focus:ring-accent/15',
            (invalid || failed) && 'border-danger/70 focus:border-danger focus:ring-danger/10',
          )}
        />
      </div>
      <span id={hintId} className="sr-only">{value === 0 ? 'Sold out. ' : value <= LOW_STOCK ? 'Low stock. ' : ''}Press Enter to save, Escape to cancel.</span>
      {dirty || saving ? (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || parsed === null}
          className="inline-flex h-9 items-center gap-1 rounded-full bg-ink px-3 text-[12px] font-semibold text-bg transition-opacity hover:bg-ink/85 disabled:opacity-50"
        >
          {saving ? <Spinner className="size-3.5" /> : <Check className="size-3.5" aria-hidden="true" />}
          {saving ? 'Saving' : 'Save'}
        </button>
      ) : null}
    </div>
  )
}
