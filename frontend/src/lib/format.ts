/** Format integer paise as rupees: ₹49, ₹49.50, ₹1,234 */
export function money(paise: number): string {
  const rupees = paise / 100
  const hasFraction = paise % 100 !== 0
  return '₹' + rupees.toLocaleString('en-IN', { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 })
}
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-IN', opts)
}
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
export function discountPct(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0
  return Math.round(((compareAt - price) / compareAt) * 100)
}
export const CATEGORY_LABELS: Record<string, string> = {
  stickers: 'Stickers', pins: 'Pins', stationery: 'Stationery', desk: 'Desk', tech: 'Tech', snacks: 'Snacks',
}
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Payment pending', paid: 'Paid', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', payment_failed: 'Payment failed', cancelled: 'Cancelled', return_requested: 'Return requested', returned: 'Returned',
}
export function plural(n: number, one: string, many = one + 's') { return `${n} ${n === 1 ? one : many}` }
