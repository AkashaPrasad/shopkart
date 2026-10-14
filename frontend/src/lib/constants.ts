/** Money constants (paise). Single source of truth for copy — the API `summary` values win when available. */
export const FREE_SHIPPING_THRESHOLD = 49900
export const SHIPPING_FEE = 4900
export const COD_FEE = 3000
export const COD_MAX_TOTAL = 500000
export const MIN_PRICE = 4900
export const MAX_PRICE = 79900
export const MAX_QTY_PER_ITEM = 10
export const RETURN_WINDOW_DAYS = 7
export const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under ₹199', max: 19900 },
  { label: '₹199–₹399', min: 19900, max: 39900 },
  { label: '₹399+', min: 39900 },
]
export const COUPON_HINTS = ['WELCOME10', 'FLAT50', 'FREESHIP']
