"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react"
import type { GalleryImage } from "@/lib/gallery"
import { cn } from "@/lib/utils"
import { GalleryUpload } from "./gallery-upload"

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const isOpen = lightbox !== null

  const close = useCallback(() => setLightbox(null), [])
  const next = useCallback(
    () => setLightbox((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  )
  const prev = useCallback(
    () => setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length],
  )

  // Blokada scrolla tła + obsługa klawiatury (Esc / strzałki) gdy podgląd otwarty.
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [isOpen, close, next, prev])

  const current = lightbox !== null ? images[lightbox] : null

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
        >
          <Camera className="size-4" />
          Dodaj swoje zdjęcie
        </button>
      </div>

      {images.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Galeria jest jeszcze pusta. Podziel się swoim zdjęciem Jejkowic!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Powiększ zdjęcie${img.alt ? `: ${img.alt}` : ` ${i + 1}`}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square",
              )}
            >
              <Image
                src={img.src || "/placeholder.svg"}
                alt={img.alt}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-navy/0 transition-colors group-hover:bg-navy/20" />
            </button>
          ))}
        </div>
      )}

      {isOpen && current && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Podgląd zdjęcia"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Zamknij podgląd"
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                aria-label="Poprzednie zdjęcie"
                className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
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
                className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          <figure
            className="flex max-h-full max-w-4xl flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pełne, nieprzycięte zdjęcie (object-contain) — normalny podgląd jak w przeglądarce zdjęć. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src || "/placeholder.svg"}
              alt={current.alt || `Zdjęcie ${lightbox! + 1} z galerii`}
              className="max-h-[82vh] w-auto rounded-2xl object-contain"
            />
            <figcaption className="flex items-center gap-2 text-sm text-white/80">
              <span>
                {lightbox! + 1} / {images.length}
              </span>
              {current.alt && <span className="text-white/50">·</span>}
              {current.alt && <span className="text-pretty">{current.alt}</span>}
            </figcaption>
          </figure>
        </div>
      )}

      {uploadOpen && <GalleryUpload onClose={() => setUploadOpen(false)} />}
    </div>
  )
}
