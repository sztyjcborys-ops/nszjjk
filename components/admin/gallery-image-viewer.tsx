'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'

/**
 * Klikalny kafelek zdjęcia w panelu galerii. Po tąpnięciu otwiera zdjęcie na
 * pełnym ekranie (overlay), aby redakcja mogła swobodnie sprawdzić materiał,
 * który jest już na froncie. Plakietka „Widoczne/Ukryte” zostaje na miniaturze.
 */
export function GalleryImageViewer({
  src,
  alt,
  published,
}: {
  src: string
  alt: string
  published: boolean
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Powiększ zdjęcie${alt ? `: ${alt}` : ''}`}
        className="group/img relative block aspect-square w-full cursor-zoom-in bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Image
          src={src || '/placeholder.svg'}
          alt={alt || ''}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <span
          className={`absolute left-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold shadow-sm ring-1 backdrop-blur-sm ${
            published
              ? 'bg-eco text-white ring-black/10'
              : 'bg-foreground/85 text-background ring-white/20'
          }`}
        >
          {published ? 'Widoczne' : 'Ukryte'}
        </span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/0 text-background opacity-0 transition-all group-hover/img:bg-foreground/30 group-hover/img:opacity-100">
          <ZoomIn className="size-6 drop-shadow" />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Powiększone zdjęcie"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zamknij"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30"
          >
            <X className="size-6" />
          </button>

          <figure
            className="flex max-h-full max-w-4xl flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src || '/placeholder.svg'}
              alt={alt || 'Powiększone zdjęcie z galerii'}
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
            {alt && (
              <figcaption className="max-w-2xl text-center text-sm text-background/80">
                {alt}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  )
}
