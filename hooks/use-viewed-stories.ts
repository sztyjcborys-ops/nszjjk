'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'jejkowice:viewed-stories'
const SYNC_EVENT = 'jejkowice:viewed-stories-change'

function readViewed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set()
  } catch {
    return new Set()
  }
}

/**
 * Śledzi, które relacje firm zostały już obejrzane (jak na Instagramie).
 * Stan trzymany jest w localStorage i synchronizowany między wszystkimi
 * instancjami hooka na stronie przez zdarzenie okna — dzięki temu pasek na
 * stronie głównej i na /firmy pokazują ten sam status.
 */
export function useViewedStories() {
  const [viewed, setViewed] = useState<Set<string>>(new Set())

  useEffect(() => {
    setViewed(readViewed())
    const sync = () => setViewed(readViewed())
    window.addEventListener(SYNC_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SYNC_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const markViewed = useCallback((id: string) => {
    setViewed((prev) => {
      if (prev.has(id)) return prev
      const nextSet = new Set(prev)
      nextSet.add(id)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...nextSet]))
      } catch {
        // localStorage niedostępne — pomijamy trwałość, stan zostaje w pamięci.
      }
      window.dispatchEvent(new Event(SYNC_EVENT))
      return nextSet
    })
  }, [])

  const isViewed = useCallback((id: string) => viewed.has(id), [viewed])

  return { isViewed, markViewed }
}
