import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Boxes, ExternalLink, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { updateProduct, useAdminProducts } from '@/hooks/useAdmin'
import { errorMessage } from '@/lib/api'
import { CATEGORY_LABELS, money, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Category, Product } from '@/types'
import { CATEGORY_LIST } from '@/components/shop/categories'
import { Seo } from '@/components/shared/Seo'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Switch } from '@/components/ui/switch'
import { pill } from '@/components/auth/form'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminSearch } from '@/components/admin/AdminSearch'
import { StockEditor } from '@/components/admin/StockEditor'
import { AdminThumb, ProductBadges } from '@/components/admin/Bits'
import { CardList, CardSkeletons, Pagination, SkeletonRows, TableCard, THead, Td, Th, Tr } from '@/components/admin/DataTable'

const LIMIT = 20
const chip = 'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors'

function ActiveSwitch({ product, onToggle }: { product: Product; onToggle: (p: Product, v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <Switch
        checked={product.isActive}
        onCheckedChange={(v) => onToggle(product, v)}
        aria-label={`${product.isActive ? 'Hide' : 'Show'} ${product.name} in the store`}
        className="data-[state=checked]:bg-success"
      />
      <span className={cn('text-[12.5px] font-medium', product.isActive ? 'text-ink' : 'text-muted')}>{product.isActive ? 'Live' : 'Hidden'}</span>
    </label>
  )
}

export default function Products() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const rawCat = params.get('category') ?? ''
  const category = CATEGORY_LIST.some((c) => c.key === rawCat) ? (rawCat as Category) : ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, setData, status, error, refetch } = useAdminProducts({ q, category, page, limit: LIMIT })

  const update = (patch: Record<string, string>, keepPage = false) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
      if (!keepPage) next.delete('page')
      return next
    }, { replace: 'q' in patch })
  }
  const goPage = (p: number) => { update({ page: p > 1 ? String(p) : '' }, true); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const patchLocal = useCallback((id: string, patch: Partial<Product>) => {
    setData((d) => (d ? { ...d, items: d.items.map((p) => (p._id === id ? { ...p, ...patch } : p)) } : d))
  }, [setData])

  /** Optimistic: show the new number now, roll back if the server says no. */
  const saveStock = async (p: Product, stock: number) => {
    const prev = p.stock
    patchLocal(p._id, { stock })
    try {
      const saved = await updateProduct(p._id, { stock })
      patchLocal(p._id, saved)
      toast.success(`${p.name}: ${plural(saved.stock, 'unit')} in stock`, prev === 0 && saved.stock > 0 ? { description: 'Back in stock — anyone waiting gets a heads-up.' } : undefined)
      return true
    } catch (e) {
      patchLocal(p._id, { stock: prev })
      toast.error(errorMessage(e, `Couldn’t update stock for ${p.name}.`))
      return false
    }
  }

  const toggleActive = async (p: Product, isActive: boolean) => {
    patchLocal(p._id, { isActive })
    try {
      const saved = await updateProduct(p._id, { isActive })
      patchLocal(p._id, saved)
      toast.success(isActive ? `${p.name} is live in the store` : `${p.name} is hidden from the store`)
    } catch (e) {
      patchLocal(p._id, { isActive: !isActive })
      toast.error(errorMessage(e, `Couldn’t update ${p.name}.`))
    }
  }

  const filtered = !!(q || category)
  const busy = status === 'loading' && !!data

  return (
    <div>
      <Seo title="Products · Admin" />
      <AdminPageHeader
        title="Products"
        sub={data ? `${plural(data.total, 'product')}${filtered ? ' match' : ' in the catalogue, hidden ones included'}. Edit stock inline — Enter saves, Esc cancels.` : 'The whole catalogue, hidden products included.'}
      />

      <div className="flex flex-col gap-3">
        <AdminSearch value={q} onChange={(v) => update({ q: v })} label="Search products" placeholder="Name, slug or tag" className="sm:max-w-sm" />
        <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <div role="group" aria-label="Filter by category" className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" aria-pressed={!category} onClick={() => update({ category: '' })} className={cn(chip, !category ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink hover:border-ink/30')}>All</button>
            {CATEGORY_LIST.map((c) => {
              const active = category === c.key
              return (
                <button key={c.key} type="button" aria-pressed={active} onClick={() => update({ category: active ? '' : c.key })} className={cn(chip, active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink hover:border-ink/30')}>
                  <c.icon className={cn('size-3.5', active ? 'text-bg' : 'text-muted')} aria-hidden="true" />{c.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {status === 'error' && !data ? (
          <ErrorState message={error ?? 'Couldn’t load products.'} onRetry={refetch} />
        ) : data && data.items.length === 0 ? (
          filtered ? (
            <EmptyState icon={<SearchX className="size-6" />} title="No products match" description={q ? `Nothing for “${q}”${category ? ` in ${CATEGORY_LABELS[category]}` : ''}.` : 'Nothing in this category yet.'} action={<button type="button" onClick={() => setParams({})} className={pill('outline')}>Clear filters</button>} />
          ) : page > 1 ? (
            <EmptyState title="Nothing on this page" description="You’ve gone past the last page." action={<button type="button" onClick={() => goPage(1)} className={pill('ink')}>Back to page 1</button>} />
          ) : (
            <EmptyState icon={<Boxes className="size-6" />} title="No products yet" description="Seed the catalogue and they’ll show up here." />
          )
        ) : (
          <>
            <TableCard label="Products" busy={busy}>
              <THead>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th align="right">Price</Th>
                <Th align="right">Compare at</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
                <Th>Badges</Th>
              </THead>
              <tbody>
                {!data ? <SkeletonRows cols={7} /> : data.items.map((p) => (
                  <Tr key={p._id}>
                    <Td className="min-w-[240px]">
                      <div className={cn('flex items-center gap-3', !p.isActive && 'opacity-60')}>
                        <AdminThumb src={p.images?.[0]} alt="" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{p.name}</p>
                          <Link to={`/product/${p.slug}`} target="_blank" rel="noopener" className="group inline-flex max-w-full items-center gap-1 text-[12.5px] text-muted hover:text-ink">
                            <span className="truncate">{p.slug}</span><ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </Link>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{CATEGORY_LABELS[p.category] ?? p.category}</Td>
                    <Td align="right" className="font-medium text-ink tabular">{money(p.price)}</Td>
                    <Td align="right" className="text-muted tabular">{p.compareAtPrice ? <s>{money(p.compareAtPrice)}</s> : <span className="text-muted/60">—</span>}</Td>
                    <Td><StockEditor value={p.stock} productName={p.name} onSave={(n) => saveStock(p, n)} /></Td>
                    <Td><ActiveSwitch product={p} onToggle={(pp, v) => void toggleActive(pp, v)} /></Td>
                    <Td><ProductBadges badges={p.badges} /></Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>

            {!data ? <CardSkeletons /> : (
              <CardList label="Products" busy={busy}>
                {data.items.map((p) => (
                  <li key={p._id} className="rounded-[var(--radius)] border border-line bg-surface p-4">
                    <div className={cn('flex items-start gap-3', !p.isActive && 'opacity-60')}>
                      <AdminThumb src={p.images?.[0]} alt="" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink">{p.name}</p>
                        <p className="truncate text-[12.5px] text-muted">{CATEGORY_LABELS[p.category] ?? p.category} · {p.slug}</p>
                        <p className="mt-1 flex items-baseline gap-2 text-sm tabular">
                          <span className="font-semibold text-ink">{money(p.price)}</span>
                          {p.compareAtPrice ? <s className="text-[12.5px] text-muted">{money(p.compareAtPrice)}</s> : null}
                        </p>
                      </div>
                    </div>
                    {p.badges?.length ? <div className="mt-3"><ProductBadges badges={p.badges} /></div> : null}
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                      <StockEditor value={p.stock} productName={p.name} onSave={(n) => saveStock(p, n)} />
                      <ActiveSwitch product={p} onToggle={(pp, v) => void toggleActive(pp, v)} />
                    </div>
                  </li>
                ))}
              </CardList>
            )}

            {data ? <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} noun={['product', 'products']} onPage={goPage} /> : null}
          </>
        )}
      </div>
    </div>
  )
}
