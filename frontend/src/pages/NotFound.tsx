import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Seo } from '@/components/shared/Seo'
import { SearchBox } from '@/components/shop/SearchBox'
import { CATEGORY_LIST } from '@/components/shop/categories'

/** A rotating "sticker" that stands in for the 0 in 404. */
function LostSticker() {
  const reduce = useReducedMotion()
  const text = 'TOO TINY TO FIND · TOO TINY TO FIND · '
  return (
    <span className="relative mx-[0.04em] inline-grid h-[0.8em] w-[0.8em] translate-y-[0.04em] place-items-center rounded-full bg-accent align-baseline text-accent-ink shadow-[0_18px_40px_-18px_var(--accent)]">
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-[6%] h-[88%] w-[88%]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
        aria-hidden="true"
      >
        <defs>
          <path id="nf-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-current font-sans" fontSize="9.4" fontWeight="700" letterSpacing="2.2">
          <textPath href="#nf-circle">{text}</textPath>
        </text>
      </motion.svg>
      <span className="font-display text-[0.32em] italic leading-none" aria-hidden="true">oops</span>
    </span>
  )
}

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="container-x flex flex-col items-center py-16 text-center sm:py-24">
      <Seo title="Page not found" description="This page is too tiny to find. Search the ShopKart shop instead." />
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(6rem,24vw,13rem)] leading-[0.9] tracking-[-0.04em]" aria-label="404">
        <span aria-hidden="true">4<LostSticker />4</span>
      </h1>
      <h2 className="mt-8 max-w-xl text-balance font-display text-3xl sm:text-4xl">
        This page is <em className="italic text-accent">too tiny</em> to find.
      </h2>
      <p className="mt-3 max-w-md text-pretty text-muted">
        We checked under every sticker and inside every pencil pouch. It isn’t here. Try a search instead?
      </p>
      <SearchBox onSubmit={q => navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')} size="lg" className="mt-8 w-full max-w-md" />
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {CATEGORY_LIST.map(c => (
          <Link key={c.key} to={`/shop?category=${c.key}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition-[color,background-color,border-color,transform] hover:border-ink active:scale-[0.98]">
            <c.icon className="h-4 w-4 text-muted" aria-hidden="true" />{c.label}
          </Link>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link to="/shop" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]">
          Shop everything <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link to="/" className="inline-flex h-12 items-center rounded-full px-5 text-sm font-medium text-muted transition-[color,background-color,border-color,transform] hover:text-ink active:scale-[0.98]">
          Back home
        </Link>
      </div>
    </div>
  )
}
