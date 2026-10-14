import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, formatDateTime, money } from '@/lib/format'
import { useAuth } from '@/store/auth'
import { isCod, type OrderDetail } from '@/hooks/useOrders'
import { ErrorState } from '@/components/shared/ErrorState'
import { Logo } from '@/components/shared/Logo'
import { pill } from '@/components/auth/form'
import { formatPhone } from '@/components/address/AddressCard'
import { paymentMethodLabel } from '@/components/account/StatusChip'

interface InvoiceData {
  order: OrderDetail & { user?: { name?: string; email?: string } | string }
  seller: { name: string; address: string; gstin: string; email: string }
  invoiceNumber: string
  issuedAt: string
}

/** The invoice is always a light "paper" document — on screen in dark mode and when printed. */
const PAPER = {
  '--surface': '#ffffff', '--surface-2': '#f4f1ea', '--ink': '#111111', '--muted': '#6b6760', '--line': '#e6e1d8', '--accent': '#ff5a1f', '--success': '#1a9a5b',
  colorScheme: 'light',
} as CSSProperties

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #sk-invoice, #sk-invoice * { visibility: visible !important; }
  #sk-invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
  #sk-invoice tr { break-inside: avoid; }
}`

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <div className="text-[13px] leading-relaxed text-ink">{children}</div>
    </div>
  )
}

export default function Invoice() {
  const { id } = useParams()
  const user = useAuth((s) => s.user)
  const [data, setData] = useState<InvoiceData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    setError(null)
    api.get<InvoiceData>(`/orders/${id}/invoice`).then(setData).catch((e) => setError(errorMessage(e, 'Couldn’t load this invoice.')))
  }, [id])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (data) document.title = `${data.invoiceNumber} · ShopKart`
    return () => { document.title = 'ShopKart — Tiny things. Big joy.' }
  }, [data])

  if (error && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Link to={`/account/orders/${id}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />Back to order</Link>
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }
  if (!data) return <div className="h-[720px] animate-pulse rounded-[20px] bg-surface-2/70" aria-busy="true" aria-label="Loading invoice" />

  const { order, seller, invoiceNumber, issuedAt } = data
  const cod = isCod(order)
  const buyerEmail = typeof order.user === 'object' && order.user?.email ? order.user.email : user?.email
  const qty = order.items.reduce((s, i) => s + i.qty, 0)
  const paidLabel = cod ? (order.payment.paidAt ? `Collected on delivery, ${formatDate(order.payment.paidAt)}` : 'Due on delivery') : order.payment.paidAt ? `Paid ${formatDateTime(order.payment.paidAt)}` : 'Not paid'

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/account/orders/${order._id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"><ArrowLeft className="size-4" />Back to order</Link>
        <button type="button" onClick={() => window.print()} className={pill('ink')}><Printer className="size-4" />Print or save PDF</button>
      </div>

      <article id="sk-invoice" style={PAPER} className="overflow-hidden rounded-[20px] border border-line bg-surface p-6 text-ink shadow-[var(--shadow-soft)] sm:p-10" aria-label={`Invoice ${invoiceNumber}`}>
        <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-muted">{seller.address}</p>
          </div>
          <div className="sm:text-right">
            <h1 className="font-display text-[2.2rem] leading-none font-medium">Invoice</h1>
            <p className="mt-2 text-[13px] font-medium tabular">{invoiceNumber}</p>
            <p className="text-[13px] text-muted">Issued {formatDate(issuedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-3">
          <Block label="Sold by">
            <p className="font-medium">{seller.name}</p>
            <p className="text-muted">{seller.email}</p>
            <p className="text-muted">GSTIN: {seller.gstin}</p>
          </Block>
          <Block label="Billed to">
            <p className="font-medium">{order.address.fullName}</p>
            {buyerEmail ? <p className="break-all text-muted">{buyerEmail}</p> : null}
            <p className="text-muted tabular">{formatPhone(order.address.phone)}</p>
          </Block>
          <Block label="Shipped to">
            <p>{[order.address.line1, order.address.line2].filter(Boolean).join(', ')}</p>
            {order.address.landmark ? <p className="text-muted">Near {order.address.landmark}</p> : null}
            <p>{order.address.city}, {order.address.state} <span className="tabular">{order.address.pincode}</span></p>
          </Block>
        </section>

        <section className="grid grid-cols-2 gap-4 border-b border-line py-5 sm:grid-cols-4">
          <Block label="Order"><span className="tabular">{order.orderNumber}</span></Block>
          <Block label="Order date">{formatDate(order.createdAt)}</Block>
          <Block label="Payment">{cod ? 'Cash on delivery' : `${paymentMethodLabel(order.payment.method) ?? 'Online'} · Razorpay`}</Block>
          <Block label="Status">{paidLabel}</Block>
        </section>

        <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <table className="mt-2 w-full min-w-[520px] border-collapse text-[13px]">
            <caption className="sr-only">Items on this invoice</caption>
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                <th scope="col" className="w-8 py-3 pr-2 font-semibold">#</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Item</th>
                <th scope="col" className="py-3 pr-4 text-right font-semibold">Qty</th>
                <th scope="col" className="py-3 pr-4 text-right font-semibold">Unit price</th>
                <th scope="col" className="py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, idx) => (
                <tr key={`${i.product}-${idx}`} className="border-b border-line align-top">
                  <td className="py-3 pr-2 text-muted tabular">{idx + 1}</td>
                  <td className="py-3 pr-4"><span className="font-medium">{i.name}</span>{i.color ? <span className="text-muted"> · {i.color}</span> : null}</td>
                  <td className="py-3 pr-4 text-right tabular">{i.qty}</td>
                  <td className="py-3 pr-4 text-right tabular">{money(i.price)}</td>
                  <td className="py-3 text-right tabular">{money(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-6 flex justify-end">
          <dl className="w-full max-w-[300px] text-[13px]">
            <div className="flex justify-between py-1.5"><dt className="text-muted">Subtotal ({qty} {qty === 1 ? 'item' : 'items'})</dt><dd className="tabular">{money(order.subtotal)}</dd></div>
            {order.discount > 0 ? <div className="flex justify-between py-1.5"><dt className="text-muted">Discount{order.coupon ? ` (${order.coupon})` : ''}</dt><dd className="tabular">−{money(order.discount)}</dd></div> : null}
            <div className="flex justify-between py-1.5"><dt className="text-muted">Shipping</dt><dd className="tabular">{order.shipping === 0 ? 'Free' : money(order.shipping)}</dd></div>
            {order.codFee ? <div className="flex justify-between py-1.5"><dt className="text-muted">Cash on delivery fee</dt><dd className="tabular">{money(order.codFee)}</dd></div> : null}
            <div className="mt-2 flex items-baseline justify-between border-t border-ink pt-3"><dt className="font-semibold">Total</dt><dd className="font-display text-2xl font-medium tabular">{money(order.total)}</dd></div>
            <p className="mt-1 text-right text-[11px] text-muted">Prices include all applicable taxes.</p>
          </dl>
        </section>

        {order.payment.razorpayPaymentId ? <p className="mt-6 text-[12px] text-muted">Payment reference: <span className="font-mono">{order.payment.razorpayPaymentId}</span></p> : null}
        <footer className="mt-8 flex flex-col gap-1 border-t border-dashed border-line pt-5 text-[12px] text-muted sm:flex-row sm:justify-between">
          <p>Thanks for shopping small. Questions? {seller.email}</p>
          <p>Computer-generated invoice — no signature required.</p>
        </footer>
      </article>
    </div>
  )
}
