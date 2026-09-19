'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { Check, X, Loader2, Clock, TriangleAlert, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'
import type { GalleryRow } from '@/lib/gallery'
import { approveGalleryImageAction, rejectGalleryImageAction } from '@/app/admin/galeria/actions'

/**
 * Sekcja moderacji: zdjęcia nadesłane przez mieszkańców (status 'pending').
 * „Akceptuj" publikuje zdjęcie w galerii, „Odrzuć" kasuje plik z R2 i rekord.
 * Kliknięcie w zdjęcie otwiera pełnoekranową przeglądarkę (również na mobile),
 * w której moderator może obejrzeć zdjęcie i od razu je zaakceptować/odrzucić.
 * Błąd (np. gdy nie udało się usunąć pliku z R2) jest pokazywany przy kafelku,
 * a rekord pozostaje nietknięty.
 */
export function GalleryPending({ images }: { images: GalleryRow[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  )
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length],
  )

  if (images.length === 0) return null

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Clock className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Oczekujące zgłoszenia</h2>
          <p className="text-xs text-muted-foreground">
            {images.length} {images.length === 1 ? 'zdjęcie' : 'zdjęć'} od mieszkańców czeka na decyzję
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((img, i) => (
          <PendingCard key={img.id} img={img} onOpen={() => setOpenIndex(i)} />
        ))}
      </ul>

      {openIndex !== null && (
        <PendingLightbox
          images={images}
          index={openIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </section>
  )
}

function useModeration(img: GalleryRow, onDone?: () => void) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  function run(kind: 'approve' | 'reject') {
    setError(null)
    setAction(kind)
    startTransition(async () => {
      const res =
        kind === 'approve'
          ? await approveGalleryImageAction(img.id)
          : await rejectGalleryImageAction(img.id)
      if (res?.error) {
        setError(res.error)
        setAction(null)
      } else {
        onDone?.()
      }
      // Sukces: revalidatePath usuwa kafelek z listy po odświeżeniu.
    })
  }

  return { isPending, error, action, run }
}

function PendingCard({ img, onOpen }: { img: GalleryRow; onOpen: () => void }) {
  const { isPending, error, action, run } = useModeration(img)

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-background">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Powiększ zdjęcie${img.alt ? `: ${img.alt}` : ''}`}
        className="group relative block aspect-square w-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Image
          src={img.src || '/placeholder.svg'}
          alt={img.alt || ''}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-amber-500/90 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
          Oczekuje
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/30 group-focus-visible:bg-foreground/30">
          <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="size-4" />
            Podgląd
          </span>
        </span>
      </button>

      <div className="p-3">
        <p className="truncate text-sm font-medium" title={img.alt}>
          {img.alt || <span className="text-muted-foreground">Bez opisu</span>}
        </p>

        {error && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => run('approve')}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-eco px-2.5 py-2.5 text-sm font-semibold text-eco-foreground transition-colors hover:bg-eco/90 disabled:opacity-60"
          >
            {isPending && action === 'approve' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Akceptuj
          </button>
          <button
            type="button"
            onClick={() => run('reject')}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
          >
            {isPending && action === 'reject' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
            Odrzuć
          </button>
        </div>
      </div>
    </li>
  )
}

function PendingLightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: GalleryRow[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const img = images[index]
  const { isPending, error, action, run } = useModeration(img, onClose)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowLeft') onPrev()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onNext, onPrev])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Podgląd zgłoszonego zdjęcia"
      className="fixed inset-0 z-[100] flex flex-col bg-foreground/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4">
        <span className="inline-flex items-center rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white">
          Oczekuje · {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="flex size-11 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30"
        >
          <X className="size-6" />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-3"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Poprzednie zdjęcie"
            className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30 md:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src || '/placeholder.svg'}
          alt={img.alt || 'Zgłoszone zdjęcie'}
          className="max-h-full max-w-full rounded-xl object-contain"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Następne zdjęcie"
            className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/15 text-background transition-colors hover:bg-background/30 md:right-6"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      <div
        className="space-y-3 border-t border-background/10 bg-background/5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {img.alt ? (
          <p className="text-center text-sm text-background/90">{img.alt}</p>
        ) : (
          <p className="text-center text-sm text-background/60">Bez opisu</p>
        )}

        {error && (
          <p className="mx-auto flex max-w-md items-start gap-1.5 rounded-lg bg-destructive/20 px-3 py-2 text-sm text-background">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => run('approve')}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-eco px-4 py-3 text-sm font-semibold text-eco-foreground transition-colors hover:bg-eco/90 disabled:opacity-60"
          >
            {isPending && action === 'approve' ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" />
            )}
            Akceptuj
          </button>
          <button
            type="button"
            onClick={() => run('reject')}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
          >
            {isPending && action === 'reject' ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <X className="size-5" />
            )}
            Odrzuć
          </button>
        </div>
      </div>
    </div>
  )
}
