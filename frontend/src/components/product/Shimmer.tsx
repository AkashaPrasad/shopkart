import { cn } from '@/lib/utils'

/*
 * Skeleton block with a soft travelling sheen instead of a flat pulse. The keyframes live in a <style> that React 19
 * hoists into <head> once (deduped by href), so no global CSS edits are needed. Reduced motion: static block.
 */
const CSS = `
.sk-shimmer{position:relative;overflow:hidden;background:var(--surface-2)}
.sk-shimmer::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
  background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.55) 50%,transparent 80%);
  animation:sk-shimmer 1.5s cubic-bezier(.4,0,.2,1) infinite}
.dark .sk-shimmer::after{background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.06) 50%,transparent 80%)}
@keyframes sk-shimmer{to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.sk-shimmer::after{animation:none;display:none}}
`

export function Shimmer({ className }: { className?: string }) {
  return (
    <>
      <style href="sk-shimmer" precedence="default">{CSS}</style>
      <div className={cn('sk-shimmer', className)} aria-hidden="true" />
    </>
  )
}
