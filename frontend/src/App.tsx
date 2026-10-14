import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/shared/PageLoader'

// Route components are lazy so the landing page loads fast. Each page file default-exports its component.
const Landing = lazy(() => import('@/pages/Landing'))
const Shop = lazy(() => import('@/pages/Shop'))
const ProductPage = lazy(() => import('@/pages/Product'))
const CartPage = lazy(() => import('@/pages/Cart'))
const WishlistPage = lazy(() => import('@/pages/Wishlist'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const OrderSuccess = lazy(() => import('@/pages/OrderSuccess'))
const AccountLayout = lazy(() => import('@/pages/account/AccountLayout'))
const AccountOverview = lazy(() => import('@/pages/account/Overview'))
const AccountOrders = lazy(() => import('@/pages/account/Orders'))
const AccountOrderDetail = lazy(() => import('@/pages/account/OrderDetail'))
const AccountAddresses = lazy(() => import('@/pages/account/Addresses'))
const AccountProfile = lazy(() => import('@/pages/account/Profile'))
const AccountInvoice = lazy(() => import('@/pages/account/Invoice'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const Track = lazy(() => import('@/pages/Track'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminOrders = lazy(() => import('@/pages/admin/Orders'))
const AdminOrderDetail = lazy(() => import('@/pages/admin/OrderDetail'))
const AdminReturns = lazy(() => import('@/pages/admin/Returns'))
const AdminProducts = lazy(() => import('@/pages/admin/Products'))
const AdminReviews = lazy(() => import('@/pages/admin/Reviews'))
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'))
const AdminSubscribers = lazy(() => import('@/pages/admin/Subscribers'))
const AdminMessages = lazy(() => import('@/pages/admin/Messages'))
const AdminCoupons = lazy(() => import('@/pages/admin/Coupons'))
const Forbidden = lazy(() => import('@/pages/admin/Forbidden'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

/** Redirects to /login?next=... when not authenticated. Waits for auth bootstrap first. */
function RequireAuth() {
  const { user, status } = useAuth()
  const loc = useLocation()
  if (status !== 'ready') return <PageLoader />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <Outlet />
}

/** Admin-only area: guests go to login (and come back), signed-in non-admins get a calm 403. */
function RequireAdmin() {
  const { user, status } = useAuth()
  const loc = useLocation()
  if (status !== 'ready') return <PageLoader />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (user.role !== 'admin') return <Forbidden />
  return <Outlet />
}

/** Sends already-logged-in users away from /login and /register. */
function GuestOnly() {
  const { user, status } = useAuth()
  const loc = useLocation()
  if (status !== 'ready') return <PageLoader />
  if (user) {
    const next = new URLSearchParams(loc.search).get('next')
    return <Navigate to={next && next.startsWith('/') ? next : '/shop'} replace />
  }
  return <Outlet />
}

export default function App() {
  const bootstrap = useAuth(s => s.bootstrap)
  const user = useAuth(s => s.user)
  const status = useAuth(s => s.status)
  const sync = useCart(s => s.sync)

  useEffect(() => { bootstrap() }, [bootstrap])
  useEffect(() => { if (status === 'ready') sync(!!user) }, [status, user?._id, sync])

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Landing />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/track" element={<Track />} />
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/success/:id" element={<OrderSuccess />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountOverview />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="orders/:id" element={<AccountOrderDetail />} />
                <Route path="orders/:id/invoice" element={<AccountInvoice />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="profile" element={<AccountProfile />} />
              </Route>
            </Route>
            <Route path="/admin" element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="returns" element={<AdminReturns />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="subscribers" element={<AdminSubscribers />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="coupons" element={<AdminCoupons />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
