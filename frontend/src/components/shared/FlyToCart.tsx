/**
 * Add-to-cart flourish: a small clone of the product image flies from where the shopper clicked to the
 * header cart icon (`[data-cart-target]`), then the cart badge bumps.
 *
 *   await flyToCart(imageBoxElement, product.images[0])
 *
 * Plain DOM + Web Animations (transform/opacity only), mounted on document.body so it works from anywhere
 * (cards, PDP, wishlist, landing). With prefers-reduced-motion it skips the flight and only bumps the badge.
 */

export const CART_BUMP_EVENT = 'sk:cart-bump'
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DURATION = 550
const MAX_START = 180

let inFlight = 0

/** True while a clone is on its way; the header waits for it to land before bumping the badge. */
export function isFlyingToCart() {
  return inFlight > 0
}

export function bumpCart() {
  window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT))
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function visibleTarget(): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'))
  return targets.find(t => {
    const r = t.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
  }) ?? null
}

export function flyToCart(fromEl: Element | null | undefined, imageUrl?: string | null): Promise<void> {
  const target = visibleTarget()
  if (!fromEl || !target || prefersReducedMotion() || typeof document.body.animate !== 'function') {
    bumpCart()
    return Promise.resolve()
  }

  const from = fromEl.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  // Start no bigger than MAX_START, centred on the source, keeping its aspect ratio.
  const scale0 = Math.min(1, MAX_START / Math.max(from.width, from.height, 1))
  const w = Math.max(24, from.width * scale0)
  const h = Math.max(24, from.height * scale0)
  const startX = from.left + from.width / 2 - w / 2
  const startY = from.top + from.height / 2 - h / 2
  const dx = to.left + to.width / 2 - (startX + w / 2)
  const dy = to.top + to.height / 2 - (startY + h / 2)
  const endScale = Math.max(0.08, 18 / Math.max(w, h))

  // Outer moves on X with a lazier curve, inner on Y with the brand ease -> it rises first, then glides: an arc.
  // Both only touch transform/opacity.
  const outer = document.createElement('div')
  outer.setAttribute('aria-hidden', 'true')
  Object.assign(outer.style, {
    position: 'fixed', left: `${startX}px`, top: `${startY}px`, width: `${w}px`, height: `${h}px`,
    zIndex: '2147483000', pointerEvents: 'none', willChange: 'transform',
  })
  const inner = document.createElement('div')
  Object.assign(inner.style, {
    width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden', willChange: 'transform, opacity',
    boxShadow: '0 12px 30px -12px rgba(20,14,4,.45)',
    background: imageUrl ? `var(--surface-2) center / cover no-repeat url("${imageUrl.replace(/"/g, '%22')}")` : 'var(--accent)',
  })
  outer.appendChild(inner)
  document.body.appendChild(outer)
  inFlight++

  const x = outer.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }],
    { duration: DURATION, easing: 'cubic-bezier(0.5, 0, 0.75, 0.9)', fill: 'forwards' },
  )
  inner.animate(
    [
      { transform: 'translateY(0) scale(1)', opacity: 1 },
      { transform: `translateY(${dy}px) scale(${endScale})`, opacity: 0.4 },
    ],
    { duration: DURATION, easing: EASE, fill: 'forwards' },
  )

  return new Promise(resolve => {
    const done = () => {
      outer.remove()
      inFlight = Math.max(0, inFlight - 1)
      bumpCart()
      resolve()
    }
    x.finished.then(done, done)
  })
}
