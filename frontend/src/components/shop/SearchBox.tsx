import { forwardRef, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

interface Props {
  /** Current committed query (e.g. from the URL). External changes are reflected in the field. */
  value?: string
  /** Called 300ms after typing stops (live search). */
  onDebouncedChange?: (q: string) => void
  /** Called on Enter. */
  onSubmit?: (q: string) => void
  placeholder?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  className?: string
  onEscape?: () => void
}

export const SearchBox = forwardRef<HTMLInputElement, Props>(function SearchBox(
  { value = '', onDebouncedChange, onSubmit, placeholder = 'Search stickers, pens, pins…', size = 'md', autoFocus, className, onEscape },
  ref,
) {
  const [text, setText] = useState(value)
  const debounced = useDebounce(text, 300)
  const committed = useRef(value)
  const onChangeRef = useRef(onDebouncedChange)
  useEffect(() => { onChangeRef.current = onDebouncedChange })
  const id = useId()

  // Reflect external changes (header search, "clear filters", back button).
  useEffect(() => {
    if (value !== committed.current) { committed.current = value; setText(value) }
  }, [value])

  useEffect(() => {
    const emit = onChangeRef.current
    if (!emit) return
    const q = debounced.trim()
    if (q !== committed.current) { committed.current = q; emit(q) }
  }, [debounced])

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = text.trim()
    if (onDebouncedChange && q !== committed.current) { committed.current = q; onDebouncedChange(q) }
    onSubmit?.(q)
  }

  function clear() {
    setText('')
    if (onDebouncedChange && committed.current !== '') { committed.current = ''; onDebouncedChange('') }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (text) { e.preventDefault(); e.stopPropagation(); clear() }
      else onEscape?.()
    }
  }

  const lg = size === 'lg'
  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">Search products</label>
      <Search className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted', lg ? 'left-5 h-5 w-5' : 'left-4 h-4 w-4')} aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        type="search"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        className={cn(
          'w-full rounded-full border border-line bg-surface text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted hover:border-ink/30 focus:border-ink [&::-webkit-search-cancel-button]:hidden',
          lg ? 'h-14 pl-13 pr-14 text-base' : 'h-11 pl-10 pr-11 text-sm',
        )}
      />
      {text ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className={cn('absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink', lg ? 'right-3 h-9 w-9' : 'right-2 h-8 w-8')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  )
})
