'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, TriangleAlert, Save, Camera, X } from 'lucide-react'
import { compressReportImage, validateInputFile } from '@/lib/image-compression'
import { saveGalleryImageAction } from '@/app/admin/galeria/actions'
import type { GalleryRow } from '@/lib/gallery'

function fieldClass(hasError?: boolean) {
  return `rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 ${
    hasError ? 'border-destructive' : 'border-input focus-visible:border-ring'
  }`
}

export function GalleryForm({ image }: { image?: GalleryRow }) {
  const [alt, setAlt] = useState(image?.alt ?? '')
  const [sortOrder, setSortOrder] = useState(String(image?.sort_order ?? 0))
  const [published, setPublished] = useState(image?.published ?? true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(image?.src ?? null)
  const [processing, setProcessing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelected(fileList: FileList | null) {
    const raw = fileList?.[0]
    if (!raw) return
    setFieldErrors((e) => ({ ...e, image_file: '' }))

    const invalid = validateInputFile(raw)
    if (invalid) {
      setFieldErrors((e) => ({ ...e, image_file: invalid }))
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
      setFieldErrors((e) => ({ ...e, image_file: 'Nie udało się przetworzyć zdjęcia. Spróbuj inne.' }))
    } finally {
      setProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const errors: Record<string, string> = {}
    if (!alt.trim()) errors.alt = 'Opis alternatywny jest wymagany (dostępność).'
    if (!image && !file) errors.image_file = 'Wybierz zdjęcie do wgrania.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const fd = new FormData()
    if (image?.id) fd.set('id', image.id)
    fd.set('alt', alt.trim())
    fd.set('sort_order', sortOrder || '0')
    if (published) fd.set('published', 'on')
    if (image?.src) fd.set('existing_src', image.src)
    if (image?.storage_path) fd.set('existing_path', image.storage_path)
    if (file) fd.set('image_file', file, file.name)

    startTransition(async () => {
      const res = await saveGalleryImageAction(fd)
      if (res?.fieldErrors) setFieldErrors(res.fieldErrors)
      if (res?.error) setFormError(res.error)
    })
  }

  const busy = processing || isPending

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Zdjęcie</span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative aspect-[4/3] w-full max-w-xs shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
            {preview ? (
              <Image src={preview || '/placeholder.svg'} alt="Podgląd zdjęcia" fill className="object-cover" sizes="320px" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Camera className="size-8" />
              </div>
            )}
            {preview && (
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setPreview((prev) => {
                    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
                    return image?.src ?? null
                  })
                }}
                aria-label="Wyczyść wybrane zdjęcie"
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-navy/80 text-navy-foreground transition-colors hover:bg-navy"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="grid gap-2">
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
              {image ? 'Zmień zdjęcie' : 'Wybierz zdjęcie'}
            </button>
            <p className="max-w-xs text-xs text-muted-foreground text-pretty">
              JPEG, PNG lub WebP. Zdjęcie zostanie zmniejszone i przekonwertowane do WebP przed wysłaniem.
            </p>
            {fieldErrors.image_file && (
              <p className="text-xs text-destructive">{fieldErrors.image_file}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="alt" className="text-sm font-medium">
          Opis alternatywny (alt)
        </label>
        <input
          id="alt"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className={fieldClass(!!fieldErrors.alt)}
          placeholder="np. Zachód słońca nad zalewem w Jejkowicach"
        />
        {fieldErrors.alt && <p className="text-xs text-destructive">{fieldErrors.alt}</p>}
        <p className="text-xs text-muted-foreground">
          Krótki opis treści zdjęcia — pomaga osobom korzystającym z czytników ekranu.
        </p>
      </div>

      <div className="grid gap-1.5 sm:max-w-[12rem]">
        <label htmlFor="sort_order" className="text-sm font-medium">
          Kolejność
        </label>
        <input
          id="sort_order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={fieldClass()}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">Mniejsza liczba = wyżej w galerii.</p>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="text-sm">
          <span className="font-medium">Widoczne publicznie</span>
          <span className="block text-xs text-muted-foreground">
            Odznacz, aby ukryć zdjęcie na stronie galerii.
          </span>
        </span>
      </label>

      {formError && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isPending ? 'Zapisywanie…' : 'Zapisz zdjęcie'}
        </button>
        <Link
          href="/admin/galeria"
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Anuluj
        </Link>
      </div>
    </form>
  )
}
