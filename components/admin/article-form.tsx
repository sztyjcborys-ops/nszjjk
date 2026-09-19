'use client'

import { useRef, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Loader2, TriangleAlert, Save, Pencil, Eye, Info, ImagePlus, X, Camera, Crop } from 'lucide-react'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { CoverImageCropper } from '@/components/admin/cover-image-cropper'
import { ThumbnailFocusPicker } from '@/components/admin/thumbnail-focus-picker'
import { parseImageFocal, withImageFocal, type ImageFocal } from '@/lib/image-focal'
import { ArticleView } from '@/components/news/article-view'
import { saveArticleAction, type EditorState } from '@/app/admin/actions'
import { formatArticleDate, formatArticleTime, toDatetimeLocalValue } from '@/lib/format'
import { uploadArticleImage } from '@/lib/supabase/upload-article-image'
import { validateInputFile } from '@/lib/image-compression'
import type { Article, ArticleGalleryImage } from '@/lib/articles'
import type { NewsCategory } from '@/lib/data'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Alert', 'Inwestycje', 'Sport', 'Komunikaty', 'Kultura', 'Rozrywka'] as const

/** Tytuł dłuższy niż to nie zmieści się w całości na kafelku na stronie głównej. */
const TITLE_SOFT_LIMIT = 65
const TITLE_MAX_LENGTH = 90

/** Podpowiedzi autorów w polu z listą — można też wpisać własnego. */
const AUTHOR_SUGGESTIONS = ['UG Jejkowice', 'Redakcja', 'Wójt Gminy Jejkowice']

function fieldClass(hasError?: boolean) {
  return `w-full min-w-0 rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 ${
    hasError ? 'border-destructive' : 'border-input focus-visible:border-ring'
  }`
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? 'Zapisywanie…' : 'Zapisz artykuł'}
    </button>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function ArticleForm({ article }: { article?: Article }) {
  const [state, formAction] = useActionState<EditorState, FormData>(saveArticleAction, {})
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  // Controlled fields so the live preview mirrors the final page as you type.
  const [title, setTitle] = useState(article?.title ?? '')
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [category, setCategory] = useState<string>(article?.category ?? '')
  const [cover, setCover] = useState(article?.cover_image ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [gallery, setGallery] = useState<ArticleGalleryImage[]>(article?.gallery ?? [])
  const [author, setAuthor] = useState(article?.author ?? '')
  const [publishedAt, setPublishedAt] = useState(
    toDatetimeLocalValue(article?.created_at ?? new Date().toISOString()),
  )

  // Upload state.
  const [coverUploading, setCoverUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Kadrowanie zdjęcia głównego: blob: URL (nowy plik) lub adres zdalny (ponowne kadrowanie).
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const errors = state.fieldErrors ?? {}
  const previewIso = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()

  // `cover` trzyma adres zdjęcia razem z zapisanym kadrem miniaturki (#focal=…).
  const { src: coverSrc, focal: coverFocal } = parseImageFocal(cover)

  function setCoverFocal(next: ImageFocal) {
    setCover(withImageFocal(cover, next))
  }

  function handleCoverSelected(fileList: FileList | null) {
    const raw = fileList?.[0]
    if (!raw) return
    setUploadError(null)
    const invalid = validateInputFile(raw)
    if (invalid) {
      setUploadError(invalid)
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    // Zamiast wgrywać od razu, otwieramy modal kadrowania na podglądzie blob:.
    const objectUrl = URL.createObjectURL(raw)
    setCropSrc(objectUrl)
    // Zwolnij ewentualny poprzedni podgląd wejściowego pliku.
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  /** Otwiera kadrowanie dla już wgranego zdjęcia (adres zdalny z Supabase Storage). */
  function handleRecrop() {
    if (!cover) return
    setUploadError(null)
    setCropSrc(parseImageFocal(cover).src)
  }

  function closeCropper() {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  /** Odbiera gotowy, wykadrowany plik 16:9 (WebP) z modala i wgrywa go do Storage. */
  async function handleCropConfirm(file: File) {
    setCoverUploading(true)
    setUploadError(null)
    try {
      const { src } = await uploadArticleImage(file)
      setCover(src)
      closeCropper()
    } catch (err) {
      setUploadError('Nie udało się wgrać zdjęcia głównego. ' + (err instanceof Error ? err.message : ''))
    } finally {
      setCoverUploading(false)
    }
  }

  async function handleGallerySelected(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : []
    if (files.length === 0) return
    setUploadError(null)
    setGalleryUploading(true)
    try {
      for (const raw of files) {
        const invalid = validateInputFile(raw)
        if (invalid) {
          setUploadError(invalid)
          continue
        }
        const { src } = await uploadArticleImage(raw)
        setGallery((prev) => [...prev, { src, alt: '' }])
      }
    } catch (err) {
      setUploadError('Nie udało się wgrać zdjęcia do galerii. ' + (err instanceof Error ? err.message : ''))
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  function removeGalleryImage(index: number) {
    setGallery((prev) => prev.filter((_, i) => i !== index))
  }

  function updateGalleryAlt(index: number, alt: string) {
    setGallery((prev) => prev.map((img, i) => (i === index ? { ...img, alt } : img)))
  }

  return (
    <form action={formAction} className="grid gap-6">
      {article?.id && <input type="hidden" name="id" value={article.id} />}
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="cover_image" value={cover} />
      <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
      <input type="hidden" name="published_at" value={publishedAt} />

      {/* Edit / Preview toggle */}
      <div className="flex w-fit items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
        <TabButton active={tab === 'edit'} onClick={() => setTab('edit')} icon={<Pencil className="size-4" />}>
          Edycja
        </TabButton>
        <TabButton active={tab === 'preview'} onClick={() => setTab('preview')} icon={<Eye className="size-4" />}>
          Podgląd
        </TabButton>
      </div>

      {/* --- EDIT TAB --- */}
      <div className={cn('grid gap-6', tab !== 'edit' && 'hidden')}>
        <div className="grid gap-1.5">
          <label htmlFor="title" className="flex items-center justify-between gap-3 text-sm font-medium">
            Tytuł
            <span
              className={cn(
                'text-xs font-normal tabular-nums',
                title.length > TITLE_SOFT_LIMIT ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {title.length}/{TITLE_MAX_LENGTH}
            </span>
          </label>
          <input
            id="title"
            name="title"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass(!!errors.title)}
            placeholder="np. Nowy plac zabaw w centrum Jejkowic"
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          <p className="text-xs text-muted-foreground text-pretty">
            Najlepiej do {TITLE_SOFT_LIMIT} znaków — tyle mieści się w całości na kafelku na stronie
            głównej. Maksymalnie {TITLE_MAX_LENGTH} znaków.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="excerpt" className="text-sm font-medium">
            Wprowadzenie (lead)
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className={fieldClass(!!errors.excerpt)}
            placeholder="Jedno–dwa zdania wprowadzające. Wyświetlą się pogrubione pod tytułem oraz na liście aktualności."
          />
          {errors.excerpt && <p className="text-xs text-destructive">{errors.excerpt}</p>}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="category" className="text-sm font-medium">
            Kategoria
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(fieldClass(!!errors.category), 'sm:max-w-xs')}
          >
            <option value="" disabled>
              Wybierz kategorię…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
        </div>

        {/* Autor + data publikacji */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="author" className="text-sm font-medium">
              Autor
            </label>
            <input
              id="author"
              name="author"
              list="author-suggestions"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={fieldClass()}
              placeholder="np. UG Jejkowice"
              autoComplete="off"
            />
            <datalist id="author-suggestions">
              {AUTHOR_SUGGESTIONS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground text-pretty">
              Wybierz z listy lub wpisz własnego autora. Puste pole = „UG Jejkowice”.
            </p>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="published_at_input" className="text-sm font-medium">
              Data i godzina publikacji
            </label>
            <input
              id="published_at_input"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className={fieldClass()}
            />
            <p className="text-xs text-muted-foreground text-pretty">
              Możesz ustawić ręcznie — data i godzina wyświetlą się przy artykule.
            </p>
          </div>
        </div>

        {/* Cover image upload */}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Zdjęcie główne</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative aspect-[16/9] w-full max-w-sm shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {cover ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverSrc || '/placeholder.svg'} alt="Podgląd zdjęcia głównego" className="size-full object-cover" />
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRecrop}
                      aria-label="Kadruj ponownie zdjęcie główne"
                      className="flex size-8 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
                    >
                      <Crop className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCover('')}
                      aria-label="Usuń zdjęcie główne"
                      className="flex size-8 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Camera className="size-8" />
                  <span className="text-xs">Brak zdjęcia</span>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => handleCoverSelected(e.target.files)}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {coverUploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                {cover ? 'Zmień zdjęcie' : 'Wybierz zdjęcie'}
              </button>
              {cover && (
                <button
                  type="button"
                  onClick={handleRecrop}
                  disabled={coverUploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Crop className="size-4" />
                  Kadruj ponownie
                </button>
              )}
              <p className="max-w-xs text-xs text-muted-foreground text-pretty">
                JPEG, PNG lub WebP. Po wybraniu zdjęcia otworzy się okno kadrowania — możesz je
                przesunąć i przybliżyć. Okładka zostaje przycięta do proporcji 16:9 i zapisana jako WebP.
              </p>
            </div>
          </div>

          {cover && (
            <div className="mt-2">
              <ThumbnailFocusPicker src={coverSrc} focal={coverFocal} onChange={setCoverFocal} />
            </div>
          )}
        </div>

        {/* Gallery upload */}
        <div className="grid gap-2">
          <span className="text-sm font-medium">Galeria zdjęć</span>
          <p className="text-xs text-muted-foreground text-pretty">
            Dodatkowe zdjęcia wyświetlą się pod treścią artykułu. Możesz wgrać kilka na raz.
          </p>

          {gallery.length > 0 && (
            <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((img, i) => (
                <div key={`${img.src}-${i}`} className="grid gap-1.5">
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src || '/placeholder.svg'} alt={img.alt || `Zdjęcie ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      aria-label={`Usuń zdjęcie ${i + 1} z galerii`}
                      className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <input
                    value={img.alt ?? ''}
                    onChange={(e) => updateGalleryAlt(i, e.target.value)}
                    className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    placeholder="Opis zdjęcia (alt)"
                  />
                </div>
              ))}
            </div>
          )}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => handleGallerySelected(e.target.files)}
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading}
            className="mt-1 inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {galleryUploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {galleryUploading ? 'Wgrywanie…' : 'Dodaj zdjęcia do galerii'}
          </button>
        </div>

        {uploadError && (
          <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            {uploadError}
          </p>
        )}

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Treść artykułu</label>
          <RichTextEditor initialContent={article?.content ?? ''} onChange={setContent} />
          {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Użyj paska narzędzi, aby dodać nagłówki, listy, cytat lub odnośnik. Kliknij
            <span className="font-medium text-foreground"> „Podgląd”</span>, aby zobaczyć, jak artykuł
            będzie wyglądał na stronie gminy.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <input
            type="checkbox"
            name="published"
            defaultChecked={article?.published ?? false}
            className="size-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Opublikuj</span>
            <span className="block text-xs text-muted-foreground">
              Zaznacz, aby artykuł był widoczny publicznie. Odznacz, aby zapisać jako szkic.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={article?.pinned ?? false}
            className="size-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Przypnij artykuł</span>
            <span className="block text-xs text-muted-foreground">
              Przypięty artykuł wyświetla się jako pierwszy na stronie głównej i na liście aktualności.
            </span>
          </span>
        </label>
      </div>

      {/* --- PREVIEW TAB --- */}
      <div className={cn(tab !== 'preview' && 'hidden')}>
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          Tak zobaczą artykuł mieszkańcy.
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <ArticleView
            preview
            title={title}
            excerpt={excerpt}
            category={(category || 'Komunikaty') as NewsCategory}
            coverImage={cover}
            contentHtml={content || '<p>Treść artykułu pojawi się tutaj…</p>'}
            gallery={gallery}
            date={formatArticleDate(previewIso)}
            time={formatArticleTime(previewIso)}
            author={author || undefined}
          />
        </div>
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Anuluj
        </Link>
      </div>

      {cropSrc && (
        <CoverImageCropper imageSrc={cropSrc} onCancel={closeCropper} onConfirm={handleCropConfirm} />
      )}
    </form>
  )
}
