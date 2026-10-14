import type { RazorpayCheckoutInfo } from '@/types'

declare global { interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void; close: () => void } } }

export interface RazorpaySuccess { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
export interface RazorpayFailure { error: { code: string; description: string; reason?: string; metadata?: { order_id?: string; payment_id?: string } } }

let loading: Promise<void> | null = null
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]')
    const s = existing ?? document.createElement('script')
    if (!existing) { s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.async = true; document.head.appendChild(s) }
    const check = () => window.Razorpay ? resolve() : undefined
    s.addEventListener('load', () => resolve())
    s.addEventListener('error', () => { loading = null; reject(new Error('Could not load the payment window. Check your connection and try again.')) })
    check()
    setTimeout(check, 1500)
  })
  return loading
}

/** Opens Razorpay Checkout. Resolves with 'dismissed' when the user closes the modal without paying. */
export function openRazorpay(info: RazorpayCheckoutInfo, opts: { onSuccess: (r: RazorpaySuccess) => void; onFailure: (r: RazorpayFailure) => void; onDismiss: () => void; themeColor?: string; name?: string; description?: string }) {
  if (!window.Razorpay) throw new Error('Payment SDK not loaded')
  const rzp = new window.Razorpay({
    key: info.keyId,
    amount: info.amount,
    currency: info.currency,
    name: opts.name ?? 'ShopKart',
    description: opts.description ?? 'Tiny things. Big joy.',
    order_id: info.orderId,
    prefill: info.prefill,
    theme: { color: opts.themeColor ?? '#111111' },
    retry: { enabled: false },
    modal: { ondismiss: opts.onDismiss, confirm_close: true, escape: true, animation: true },
    handler: (r: unknown) => opts.onSuccess(r as RazorpaySuccess),
  })
  rzp.on('payment.failed', (r: unknown) => opts.onFailure(r as RazorpayFailure))
  rzp.open()
  return rzp
}
