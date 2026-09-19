'use client'

import { useCallback, useEffect, useState } from 'react'
import { Images, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ArticleGalleryImage } from '@/lib/articles'

export function GalleryLightbox({ gallery }: { gallery: ArticleGalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const isOpen = openIndex !== null

  const close = useCallback(() => setOpenIndex(null), [])
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % gallery.length)),
    [gallery.length],
  )
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length)),
    [gallery.length],
  )

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, close, next, prev])

  if (gallery.length === 0) return null

  const current = openIndex !== null ? gallery[openIndex] : null

  return (
    <section className="mt-8 md:mt-10" aria-label="Galeria zdjęć">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground md:text-xl">
        <Images className="size-5 text-primary" />
        Galeria zdjęć
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {gallery.map((img, i) => (
          <button
            key={`${img.src}-${i}`}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`Powiększ zdjęcie ${i + 1}${img.alt ? `: ${img.alt}` : ''}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src || '/placeholder.svg'}
              alt={img.alt || `Zdjęcie ${i + 1} z galerii artykułu`}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {isOpen && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Powiększone zdjęcie"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Zamknij"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30"
          >
            <X className="size-6" />
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                aria-label="Poprzednie zdjęcie"
                className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30 md:left-6"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                aria-label="Następne zdjęcie"
                className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30 md:right-6"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          <figure className="flex max-h-full max-w-4xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src || '/placeholder.svg'}
              alt={current.alt || `Zdjęcie ${openIndex! + 1} z galerii artykułu`}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            <figcaption className="flex items-center gap-3 text-sm text-background/80">
              <span>
                {openIndex! + 1} / {gallery.length}
              </span>
              {current.alt && <span className="text-background/60">·</span>}
              {current.alt && <span>{current.alt}</span>}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}
