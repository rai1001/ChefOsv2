'use client'

import { useEffect } from 'react'

/**
 * Actualiza `document.title` con el patrón "<page> — ChefOS".
 * Uso en client components que no pueden exportar `metadata` de Next.js.
 * Cumple WCAG 2.4.2 Page Titled.
 */
export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = `${pageTitle} — ChefOS`
    return () => {
      document.title = previous
    }
  }, [pageTitle])
}
