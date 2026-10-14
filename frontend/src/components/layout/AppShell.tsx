import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { MiniCart } from '@/components/cart/MiniCart'
import { AddedToCartCard } from '@/components/cart/AddedToCartCard'

/** Global page chrome. Header/Footer/MiniCart are owned by the frontend-core agent. */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MiniCart />
      <AddedToCartCard />
    </div>
  )
}
