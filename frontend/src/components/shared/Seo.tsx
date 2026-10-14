import { useEffect } from 'react'

const SITE = 'ShopKart'

/** Sets document.title and the meta description for the current page; restores the previous values on unmount. */
export function Seo({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevTitle = document.title
    const prevDescription = meta?.content
    document.title = title ? `${title} · ${SITE}` : `${SITE} — Tiny things. Big joy.`
    if (meta && description) meta.content = description
    return () => {
      document.title = prevTitle
      if (meta && prevDescription !== undefined) meta.content = prevDescription
    }
  }, [title, description])
  return null
}
