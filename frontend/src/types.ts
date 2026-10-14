export type Category = 'stickers' | 'pins' | 'stationery' | 'desk' | 'tech' | 'snacks'
export type Badge = 'new' | 'bestseller' | 'limited'

export interface User {
  _id: string
  name: string
  email: string
  phone?: string
  avatarUrl?: string
  role: 'user' | 'admin'
  hasPassword?: boolean
  createdAt: string
}

export interface ProductColor { name: string; hex: string }

export interface Product {
  _id: string
  slug: string
  name: string
  tagline: string
  description: string
  price: number // paise
  compareAtPrice?: number | null
  images: string[]
  category: Category
  tags: string[]
  stock: number
  rating: number
  reviewCount: number
  colors?: ProductColor[]
  badges: Badge[]
  isActive: boolean
  createdAt: string
}

export type ProductLite = Pick<Product, '_id' | 'slug' | 'name' | 'price' | 'compareAtPrice' | 'images' | 'stock' | 'category' | 'colors' | 'badges' | 'tagline'>

/** Product shape embedded in cart lines. Server sends a single `image`; some callers still pass full products with `images[]`. */
export type CartProduct = Pick<Product, '_id' | 'slug' | 'name' | 'price' | 'compareAtPrice' | 'stock' | 'category'> & {
  image?: string
  images?: string[]
  colors?: ProductColor[]
  badges?: Badge[]
  tagline?: string
  isActive?: boolean
}

export interface CartItem {
  product: CartProduct
  productId?: string
  qty: number
  color?: string | null
  lineTotal: number
  available?: boolean
  inStock?: boolean
  maxQty?: number
  issue?: { reason: string; message: string } | null
}

/** Coupon state as returned by /cart/quote and the server cart. */
export interface CouponState { code: string; valid: boolean; message?: string | null }

export interface CartSummary {
  subtotal: number
  discount: number
  shipping: number
  total: number
  freeShippingThreshold: number
  amountToFreeShipping: number
  itemCount: number
}

export interface Cart {
  items: CartItem[]
  /** Applied coupon code (string) — normalised by the cart store from either a string or a CouponState object. */
  coupon?: string | null
  couponError?: string | null
  summary: CartSummary
}

export type AddressType = 'home' | 'work' | 'other'
export interface Address {
  _id: string
  fullName: string
  phone: string
  pincode: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  state: string
  type: AddressType
  isDefault: boolean
  createdAt: string
}
export type AddressInput = Omit<Address, '_id' | 'createdAt' | 'isDefault'> & { isDefault?: boolean }

export type OrderStatus = 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'payment_failed' | 'cancelled' | 'return_requested' | 'returned'

export interface OrderItem {
  product: string
  name: string
  slug: string
  image: string
  price: number
  qty: number
  color?: string | null
}

export interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  address: Omit<Address, '_id' | 'createdAt' | 'isDefault'>
  subtotal: number
  discount: number
  shipping: number
  total: number
  coupon?: string | null
  status: OrderStatus
  payment: {
    provider: 'razorpay' | 'cod'
    razorpayOrderId?: string
    razorpayPaymentId?: string
    method?: string
    paidAt?: string
    failureReason?: string
  }
  timeline: { status: OrderStatus; at: string; note?: string }[]
  createdAt: string
  // Storefront additions (COD, notes, returns)
  paymentMethod?: 'razorpay' | 'cod'
  codFee?: number // paise
  deliveryNote?: string | null
  giftMessage?: string | null
  deliveredAt?: string | null
  return?: { reason: string; note?: string | null; requestedAt: string; resolvedAt?: string | null } | null
}

export interface RazorpayCheckoutInfo {
  orderId: string
  amount: number
  currency: string
  keyId: string
  prefill: { name?: string; email?: string; contact?: string }
}

export interface Paginated<T> { items: T[]; total: number; page: number; pages: number }
export interface ProductListResponse extends Paginated<Product> {
  facets: { categories: { key: Category; count: number }[]; priceRange: { min: number; max: number } }
}

export interface ApiErrorShape { code: string; message: string; details?: unknown }

/* ---------- Admin console ---------- */

/** `name`/`email` are null when the customer deleted their account. */
export interface AdminUserRef { _id: string; name: string | null; email: string | null }

/** Order statuses the admin console handles, including the returns flow. */
export type AdminOrderStatus = OrderStatus | 'return_requested' | 'returned'
export type ReturnReason = 'damaged' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'other'
export type PaymentMethod = 'razorpay' | 'cod'

/** An order as the admin API returns it: the regular order plus who placed it, COD/returns and refund bookkeeping. */
export type AdminOrder = Omit<Order, 'status' | 'timeline' | 'payment'> & {
  status: AdminOrderStatus
  timeline: { status: AdminOrderStatus; at: string; note?: string }[]
  user: AdminUserRef | null
  payment: Omit<Order['payment'], 'provider'> & {
    provider: PaymentMethod
    refundId?: string
    refundStatus?: 'pending' | 'processed' | 'failed' | 'manual'
  }
  paymentMethod?: PaymentMethod
  codFee?: number // paise
  deliveryNote?: string | null
  giftMessage?: string | null
  return?: { reason: ReturnReason | string; note?: string | null; requestedAt: string; resolvedAt?: string | null } | null
  deliveredAt?: string | null
  updatedAt?: string
}

export interface AdminLowStockItem { _id: string; name: string; slug: string; stock: number; image?: string | null }
export interface AdminSalesDay { date: string; total: number; count: number }

export interface AdminStats {
  revenue: number // paise
  ordersCount: number
  ordersByStatus: Partial<Record<AdminOrderStatus, number>>
  customersCount: number
  productsCount: number
  lowStock: AdminLowStockItem[]
  recentOrders: AdminOrder[]
  salesByDay: AdminSalesDay[]
  returnsPending?: number
  codOrders?: number
}

export interface AdminCustomer {
  _id: string
  name: string
  email: string
  role: User['role']
  createdAt: string
  ordersCount: number
  totalSpent: number // paise
}

export type AdminProductPatch = Partial<Pick<Product, 'stock' | 'price' | 'compareAtPrice' | 'isActive' | 'badges'>>

export type CouponType = 'percent' | 'flat' | 'freeship'
export interface Coupon {
  _id: string
  code: string
  type: CouponType
  value: number // percent for 'percent', paise for 'flat'
  maxDiscount?: number | null // paise
  minSubtotal?: number | null // paise
  isActive: boolean
  expiresAt?: string | null
  createdAt?: string
}

export interface AdminReview {
  _id: string
  rating: number
  title?: string | null
  body?: string | null
  verified?: boolean
  createdAt: string
  product: { _id: string; name: string; slug: string; image?: string | null; images?: string[] } | null
  user: { _id: string; name: string | null; email?: string | null; avatarUrl?: string | null } | null
}

export interface AdminSubscriber { _id: string; email: string; source?: string | null; createdAt: string }

export interface AdminMessage {
  _id: string
  name: string
  email: string
  subject?: string | null
  message: string
  createdAt: string
}
