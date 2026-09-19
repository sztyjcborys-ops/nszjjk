'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Camera, X, Loader2, CheckCircle2, TriangleAlert } from 'lucide-react'
import { compressReportImage, validateInputFile } from '@/lib/image-compression'
import { submitGalleryPhotoAction } from '@/app/galeria/actions'

/**
 * Modal do nadsyłania zdjęć przez mieszkańców. Zdjęcie jest kompresowane do
 * WebP w przeglądarce (jak w formularzu redakcji), a następnie wysyłane do
 * server action, który zapisuje je w R2 ze statusem „oczekuje".
 */
export function GalleryUpload({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Blokada scrolla tła + zamykanie klawiszem Esc, gdy modal jest otwarty.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function handleFileSelected(fileList: FileList | null) {
    const raw = fileList?.[0]
    if (!raw) return
    setError(null)

    const invalid = validateInputFile(raw)
    if (invalid) {
      setError(invalid)
      return
    }

    setProcessing(true)
    try {
      const { blob, fileName } = await compressReportImage(raw)
      const compressed = new File([blob], fileName, { type: 'image/webp' })
      setFile(compressed)
      setPreview((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
        return URL.createObjectURL(compressed)
      })
    } catch {
      setError('Nie udało się przetworzyć zdjęcia. Spróbuj inne.')
    } finally {
      setProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Wybierz zdjęcie do przesłania.')
      return
    }

    const fd = new FormData()
    fd.set('image_file', file, file.name)
    fd.set('alt', alt.trim())

    startTransition(async () => {
      const res = await submitGalleryPhotoAction(fd)
      if (res?.error) {
        setError(res.error)
        return
      }
      setDone(true)
    })
  }

  const busy = processing || isPending

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dodaj zdjęcie do galerii"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-eco/15 text-eco">
              <CheckCircle2 className="size-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Dziękujemy!</h2>
            <p className="mt-1 text-pretty text-sm text-muted-foreground">
              Twoje zdjęcie zostało przesłane i czeka na akceptację redakcji. Pojawi się w galerii
              po zatwierdzeniu.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Dodaj swoje zdjęcie</h2>
              <p className="mt-1 text-pretty text-sm text-muted-foreground">
                Podziel się kadrem z Jejkowic. Zdjęcie trafi do galerii po akceptacji redakcji.
              </p>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
              {preview ? (
                <Image
                  src={preview || '/placeholder.svg'}
                  alt="Podgląd zdjęcia"
                  fill
                  className="object-cover"
                  sizes="28rem"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Camera className="size-8" />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => handleFileSelected(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {file ? 'Zmień zdjęcie' : 'Wybierz zdjęcie'}
            </button>

            <div className="grid gap-1.5">
              <label htmlFor="gallery-alt" className="text-sm font-medium">
                Opis (opcjonalnie)
              </label>
              <input
                id="gallery-alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                maxLength={160}
                placeholder="np. Zachód słońca nad zalewem"
                className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                <TriangleAlert className="size-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {isPending ? 'Wysyłanie…' : 'Wyślij zdjęcie'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
