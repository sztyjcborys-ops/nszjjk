'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ArrowUpRight } from 'lucide-react'
import type { LocalBusiness } from '@/lib/local-businesses'
import { SampleBadge } from '@/components/shared/sample-badge'
import { useViewedStories } from '@/hooks/use-viewed-stories'

const SLIDE_MS = 5000

type Position = { biz: number; slide: number }

/**
 * Pełnoekranowa przeglądarka relacji (rolek) firm — wzorzec „stories":
 *  • paski postępu u góry (po jednym na slajd bieżącej firmy),
 *  • auto-przewijanie co 5 s z animowanym paskiem,
 *  • tap w lewą/prawą połowę = poprzedni/następny slajd,
 *  • przytrzymanie = pauza,
 *  • przejście za ostatni slajd firmy przeskakuje do kolejnej firmy,
 *  • Escape / przycisk X / kliknięcie tła zamyka.
 *
 * Renderowana przez portal na `document.body`, z blokadą przewijania strony.
 */
export function StoryViewer({
  businesses,
  startIndex,
  onClose,
}: {
  businesses: LocalBusiness[]
  startIndex: number
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<Position>({ biz: startIndex, slide: 0 })
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startedRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  const { markViewed } = useViewedStories()

  useEffect(() => setMounted(true), [])

  const biz = businesses[pos.biz]
  const stories = biz?.stories ?? []
  const slide = stories[pos.slide]

  // Oznacz firmę jako obejrzaną, gdy tylko jej relacja pojawi się na ekranie
  // (jak na Instagramie — obwódka staje się wtedy szara).
  useEffect(() => {
    if (biz) markViewed(biz.id)
  }, [biz, markViewed])

  const goClose = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    onClose()
  }, [onClose])

  const next = useCallback(() => {
    setPos((p) => {
      const list = businesses[p.biz]?.stories ?? []
      if (p.slide + 1 < list.length) return { biz: p.biz, slide: p.slide + 1 }
      // szukaj następnej firmy, która ma relacje
      for (let i = p.biz + 1; i < businesses.length; i++) {
        if ((businesses[i].stories?.length ?? 0) > 0) return { biz: i, slide: 0 }
      }
      goClose()
      return p
    })
  }, [businesses, goClose])

  const prev = useCallback(() => {
    setPos((p) => {
      if (p.slide > 0) return { biz: p.biz, slide: p.slide - 1 }
      for (let i = p.biz - 1; i >= 0; i--) {
        const len = businesses[i].stories?.length ?? 0
        if (len > 0) return { biz: i, slide: len - 1 }
      }
      return p
    })
  }, [businesses])

  // Reset licznika przy każdej zmianie slajdu.
  useEffect(() => {
    elapsedRef.current = 0
    startedRef.current = null
    setProgress(0)
  }, [pos.biz, pos.slide])

  // Pętla animacji paska postępu + auto-przejście.
  useEffect(() => {
    if (!slide) return
    const tick = (now: number) => {
      if (paused) {
        startedRef.current = now
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      if (startedRef.current == null) startedRef.current = now
      const total = elapsedRef.current + (now - startedRef.current)
      const ratio = Math.min(total / SLIDE_MS, 1)
      setProgress(ratio)
      if (ratio >= 1) {
        next()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (startedRef.current != null && !paused) {
        elapsedRef.current += performance.now() - startedRef.current
      }
    }
  }, [slide, paused, next])

  // Blokada scrolla + Escape.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [goClose, next, prev])

  if (!mounted || !biz || !slide) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Relacje: ${biz.name}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 ease-out"
      onClick={goClose}
    >
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-navy sm:h-[92vh] sm:rounded-3xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zdjęcie tła */}
        <Image
          key={slide.id}
          src={slide.image}
          alt=""
          fill
          sizes="(min-width: 640px) 28rem, 100vw"
          className="animate-in fade-in zoom-in-105 object-cover duration-500 ease-out"
          priority
        />
        <SampleBadge className="right-3 top-16" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/75" />

        {/* Strefy dotyku: lewa (wstecz) / prawa (dalej) */}
        <button
          type="button"
          aria-label="Poprzednia relacja"
          onClick={prev}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default outline-none"
        />
        <button
          type="button"
          aria-label="Następna relacja"
          onClick={next}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-default outline-none"
        />

        {/* Paski postępu */}
        <div className="relative z-20 flex gap-1.5 px-3 pt-3">
          {stories.map((s, i) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <span
                className="block h-full rounded-full bg-white"
                style={{
                  width:
                    i < pos.slide ? '100%' : i === pos.slide ? `${progress * 100}%` : '0%',
                }}
              />
            </span>
          ))}
        </div>

        {/* Nagłówek */}
        <div className="relative z-20 flex items-center gap-3 px-3 pb-2 pt-3">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white/80">
            <Image src={biz.image} alt="" fill sizes="36px" className="object-cover" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-white">{biz.name}</p>
            <p className="truncate text-xs text-white/70">{slide.timeAgo}</p>
          </div>
          <button
            type="button"
            onClick={goClose}
            aria-label="Zamknij relacje"
            className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Treść promocji */}
        <div
          key={slide.id}
          className="relative z-20 mt-auto flex animate-in flex-col items-center gap-4 px-6 pb-4 text-center fade-in slide-in-from-bottom-3 duration-300 ease-out"
        >
          <span className="inline-block -rotate-2 rounded-xl bg-destructive px-4 py-2 text-xl font-extrabold uppercase leading-tight tracking-tight text-white shadow-lg text-balance sm:text-2xl">
            {slide.badge}
          </span>
          <div>
            <p className="font-script text-3xl text-white drop-shadow-md">{slide.title}</p>
            {slide.subtitle && (
              <p className="mt-1 text-sm font-medium text-white/85 text-pretty">
                {slide.subtitle}
              </p>
            )}
          </div>
          {slide.cta && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-navy shadow-lg transition-transform active:scale-[0.98]"
            >
              <ArrowUpRight className="size-4" />
              {slide.cta}
            </button>
          )}
        </div>

        <div className="relative z-20 pb-6" />
      </div>
    </div>,
    document.body,
  )
}
