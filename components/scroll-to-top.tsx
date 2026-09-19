"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Przy nawigacji „w przód" (kliknięcie w link) upewnia się, że nowa podstrona
 * startuje od samej góry.
 *
 * Właściwa przyczyna „przesunięcia w dół" na Firefoksie NIE jest tutaj — to było
 * scroll anchoring przeglądarki (patrz `overflow-anchor: none` w globals.css).
 * Ten komponent zostawiamy minimalny:
 *  - NIE ustawiamy `history.scrollRestoration = "manual"` — natywne przywracanie
 *    pozycji przy cofaniu zostawiamy przeglądarce,
 *  - NIE ruszamy scrolla przy nawigacji wstecz/w przód (POP),
 *  - NIE ruszamy scrolla przy pierwszym renderze (wejście/odświeżenie strony).
 */
export function ScrollToTop() {
  const pathname = usePathname()
  const isFirstRef = useRef(true)
  const isPopRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const onPopState = () => {
      isPopRef.current = true
      window.setTimeout(() => {
        isPopRef.current = false
      }, 400)
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    // Pierwsze wejście / odświeżenie — nie dotykamy scrolla.
    if (isFirstRef.current) {
      isFirstRef.current = false
      return
    }

    // Cofanie / przód w historii — pozwalamy przeglądarce przywrócić pozycję.
    if (isPopRef.current) {
      isPopRef.current = false
      return
    }

    // Nawigacja „w przód" (klik w link) — start od góry.
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
