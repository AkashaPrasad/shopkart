import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

/**
 * Search field for admin lists. `value` is the committed query (usually from the URL);
 * `onChange` fires 300ms after typing stops, on Enter, and on clear.
 */
export function AdminSearch({ value, onChange, label, placeholder, className }: { value: string; onChange: (q: string) => void; label: string; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value)
  const debounced = useDebounce(text, 300)
  const committed = useRef(value)
  const emit = useRef(onChange)
  useEffect(() => { emit.current = onChange })
  const id = useId()

  // Reflect external changes (back button, chip that resets the query).
  useEffect(() => {
    if (value !== committed.current) { committed.current = value; setText(value) }
  }, [value])

  useEffect(() => {
    const q = debounced.trim()
    if (q !== committed.current) { committed.current = q; emit.current(q) }
  }, [debounced])

  const commit = (q: string) => {
    if (q !== committed.current) { committed.current = q; emit.current(q) }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); commit(text.trim()) }
  const clear = () => { setText(''); commit('') }

  return (
    <form role="search" onSubmit={submit} className={cn('relative min-w-0', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape' && text) { e.preventDefault(); clear() } }}
        placeholder={placeholder ?? label}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={80}
        className="h-11 w-full rounded-full border border-line bg-surface pr-11 pl-10 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-ink/30 focus:border-ink focus:ring-[3px] focus:ring-ink/[0.06] [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button type="button" onClick={clear} aria-label="Clear search" className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink">
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  )
}
