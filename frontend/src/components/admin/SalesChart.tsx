import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { money, plural } from '@/lib/format'
import type { AdminSalesDay } from '@/types'

/* ----------------------------------------------------------------------------
 * 14-day sales columns. Pure SVG, measured to its container so text never
 * scales. Single series (tangerine), hairline grid, 4px rounded data-ends,
 * per-column hover/tap tooltip, arrow-key exploration, and an sr-only table.
 * ------------------------------------------------------------------------- */

const DAYS = 14
const H = 220
const M = { top: 14, right: 4, bottom: 28, left: 48 }
const EASE = [0.22, 1, 0.36, 1] as const

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const rupeesTick = (paise: number) => '₹' + compact.format(paise / 100)

function parseDay(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fmtLong = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** Always 14 consecutive days ending on the newest day the API reported (or today), zero-filled. */
function normalise(data: AdminSalesDay[]): AdminSalesDay[] {
  const byDay = new Map(data.map((d) => [d.date, d]))
  const last = data.length ? data.map((d) => d.date).sort().at(-1)! : dayKey(new Date())
  const end = parseDay(last)
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(end)
    d.setDate(end.getDate() - (DAYS - 1 - i))
    const key = dayKey(d)
    return byDay.get(key) ?? { date: key, total: 0, count: 0 }
  })
}

/** Rounds the axis max up to 1/2/2.5/5 × 10ⁿ rupees so ticks land on clean numbers. */
function niceMax(maxPaise: number, ticks = 4) {
  const rupees = maxPaise / 100
  if (rupees <= 0) return 100 * 100
  const raw = rupees / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return Math.ceil(rupees / step) * step * 100
}

/** Column path: 4px rounded top, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  const b = y + h
  return `M${x},${b}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${b}Z`
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function SalesChart({ data, loading }: { data: AdminSalesDay[] | null; loading?: boolean }) {
  const days = useMemo(() => (data ? normalise(data) : null), [data])
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const liveId = useId()

  const sum = days?.reduce((s, d) => s + d.total, 0) ?? 0
  const orders = days?.reduce((s, d) => s + d.count, 0) ?? 0
  const peak = days ? Math.max(...days.map((d) => d.total)) : 0
  const yMax = niceMax(peak)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f))

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = H - M.top - M.bottom
  const band = plotW / DAYS
  const barW = Math.max(4, Math.min(24, band * 0.62))
  const labelEvery = band >= 30 ? 1 : band >= 18 ? 2 : 3
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!days) return
    const cur = active ?? DAYS - 1
    const next = e.key === 'ArrowLeft' ? cur - 1 : e.key === 'ArrowRight' ? cur + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? DAYS - 1 : null
    if (next === null) { if (e.key === 'Escape') setActive(null); return }
    e.preventDefault()
    setActive(Math.max(0, Math.min(DAYS - 1, next)))
  }

  const a = active !== null && days ? days[active] : null
  const aCenter = active !== null ? M.left + active * band + band / 2 : 0
  const aTop = a ? (a.total > 0 ? Math.min(y(a.total), M.top + plotH - 3) : M.top + plotH - 2) : 0
  // Tooltip sits above the column; when the column is too tall for that, it moves beside it.
  const TIP_H = 76
  const above = aTop - 10 >= TIP_H
  const tipStyle = above
    ? { left: Math.max(72, Math.min(width - 72, aCenter)), top: aTop - 10, transform: 'translate(-50%, -100%)' }
    : aCenter > width / 2
      ? { left: aCenter - barW / 2 - 8, top: M.top, transform: 'translateX(-100%)' }
      : { left: aCenter + barW / 2 + 8, top: M.top, transform: 'none' }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="font-sans text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">Sales · last 14 days</h2>
          {loading || !days ? (
            <div className="mt-3 h-8 w-40 animate-pulse rounded-lg bg-surface-2" aria-hidden="true" />
          ) : (
            <p className="mt-2 font-display text-[2rem] leading-none font-medium">{money(sum)}</p>
          )}
        </div>
        {days && !loading ? <p className="text-[13px] text-muted tabular">{plural(orders, 'order')} · best day {money(peak)}</p> : null}
      </div>

      <div
        ref={wrapRef}
        className="relative mt-5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
        style={{ height: H }}
        tabIndex={days ? 0 : -1}
        role="group"
        aria-label="Daily sales chart. Use the left and right arrow keys to read each day."
        aria-describedby={liveId}
        onKeyDown={onKeyDown}
        onFocus={() => { if (active === null) setActive(DAYS - 1) }}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        {width > 0 ? (
          <svg width={width} height={H} className="block overflow-visible" aria-hidden="true">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} shapeRendering="crispEdges" />
                <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fill="var(--muted)" fontSize={11} className="tabular">{rupeesTick(t)}</text>
              </g>
            ))}

            {(days ?? Array.from({ length: DAYS }, (_, i) => ({ date: String(i), total: 0, count: 0 }))).map((d, i) => {
              const x = M.left + i * band + (band - barW) / 2
              if (loading || !days) {
                const h = plotH * (0.25 + 0.5 * Math.abs(Math.sin(i * 1.7)))
                return <rect key={i} x={x} y={M.top + plotH - h} width={barW} height={h} rx={4} fill="var(--surface-2)" className="animate-pulse" />
              }
              const h = d.total > 0 ? Math.max(3, (d.total / yMax) * plotH) : 0
              const dim = active !== null && active !== i
              return (
                <g key={d.date}>
                  {h > 0 ? (
                    <motion.path
                      d={columnPath(x, M.top + plotH - h, barW, h)}
                      fill="var(--accent)"
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1, opacity: dim ? 0.35 : 1 }}
                      transition={{ scaleY: { duration: 0.5, ease: EASE, delay: i * 0.025 }, opacity: { duration: 0.15 } }}
                      style={{ originY: 1, transformBox: 'fill-box' }}
                    />
                  ) : (
                    <rect x={x} y={M.top + plotH - 2} width={barW} height={2} rx={1} fill="var(--muted)" opacity={dim ? 0.15 : 0.3} />
                  )}
                </g>
              )
            })}

            <line x1={M.left} x2={width - M.right} y1={M.top + plotH} y2={M.top + plotH} stroke="var(--muted)" strokeOpacity={0.45} strokeWidth={1} shapeRendering="crispEdges" />

            {days?.map((d, i) => {
              const show = (DAYS - 1 - i) % labelEvery === 0
              if (!show) return null
              const date = parseDay(d.date)
              const isLast = i === DAYS - 1
              const text = isLast ? 'Today' : i < labelEvery || date.getDate() === 1 ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : String(date.getDate())
              return (
                <text key={d.date} x={M.left + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={active === i ? 'var(--ink)' : 'var(--muted)'} fontWeight={active === i || isLast ? 600 : 400} className="tabular">
                  {text}
                </text>
              )
            })}

            {/* Hit targets: the whole column band, taller than the mark. */}
            {days && !loading
              ? days.map((d, i) => (
                  <rect
                    key={d.date}
                    x={M.left + i * band}
                    y={M.top}
                    width={band}
                    height={plotH + M.bottom}
                    fill="transparent"
                    onMouseEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                  />
                ))
              : null}
          </svg>
        ) : null}

        {a ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[128px] rounded-xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-lift)]"
            style={tipStyle}
          >
            <p className="text-[11px] font-medium text-muted">{fmtLong(parseDay(a.date))}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink tabular">{money(a.total)}</p>
            <p className="text-[12px] text-muted tabular">{a.count === 0 ? 'No orders' : plural(a.count, 'order')}</p>
          </div>
        ) : null}

        {days && !loading && sum === 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-muted">No sales in the last 14 days yet.</p>
        ) : null}
      </div>

      <p id={liveId} className="sr-only" aria-live="polite">
        {a ? `${fmtLong(parseDay(a.date))}: ${money(a.total)} from ${plural(a.count, 'order')}.` : days ? `${money(sum)} across ${plural(orders, 'order')} in the last 14 days.` : ''}
      </p>

      {days ? (
        <table className="sr-only">
          <caption>Sales by day, last 14 days</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Sales</th><th scope="col">Orders</th></tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}><th scope="row">{fmtLong(parseDay(d.date))}</th><td>{money(d.total)}</td><td>{d.count}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
