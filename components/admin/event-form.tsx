'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Loader2, TriangleAlert, Save, Camera, Crop, X, Pencil, Eye, Info } from 'lucide-react'
import { saveEventAction, type EventFormState } from '@/app/admin/wydarzenia/actions'
import { CoverImageCropper } from '@/components/admin/cover-image-cropper'
import { HighlightsEditor } from '@/components/admin/highlights-editor'
import { LocationPicker } from '@/components/admin/location-picker'
import { EventView } from '@/components/events/event-view'
import { uploadArticleImage } from '@/lib/supabase/upload-article-image'
import { validateInputFile } from '@/lib/image-compression'
import { formatEventLongDate } from '@/lib/data'
import type { EventRow } from '@/lib/events'
import { parseParkings, type ParkingSpot } from '@/lib/parkings'
import { cn } from '@/lib/utils'

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
      {pending ? 'Zapisywanie…' : 'Zapisz wydarzenie'}
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

export function EventForm({ event }: { event?: EventRow }) {
  const [state, formAction] = useActionState<EventFormState, FormData>(saveEventAction, {})
  const errors = state.fieldErrors ?? {}

  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  // Pola kontrolowane, aby podgląd na żywo odzwierciedlał gotową stronę wydarzenia.
  const [title, setTitle] = useState(event?.title ?? '')
  const [eventDate, setEventDate] = useState(event?.event_date ?? '')
  const [eventTime, setEventTime] = useState(event?.event_time ?? '')
  const [place, setPlace] = useState(event?.place ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [intro, setIntro] = useState(event?.intro ?? '')
  const [description, setDescription] = useState(event?.description?.join('\n\n') ?? '')
  const [highlights, setHighlights] = useState(event?.highlights?.join('\n') ?? '')
  const [program, setProgram] = useState(
    event?.program?.map((p) => p.replace('|', ' ')).join('\n') ?? '',
  )
  const [latitude, setLatitude] = useState<number | null>(event?.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(event?.longitude ?? null)
  const [parkings, setParkings] = useState<ParkingSpot[]>(() => parseParkings(event?.parkings))
  const [free, setFree] = useState(event?.free ?? true)
  const [organizer, setOrganizer] = useState(event?.organizer ?? 'Urząd Gminy Jejkowice')

  // Zdjęcie wydarzenia: adres w Storage trzymany w stanie i wysyłany w ukrytym polu.
  const [image, setImage] = useState(event?.image ?? '')
  const [imageUploading, setImageUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Podgląd: zamień pola tekstowe na tablice akapitów / atrakcji.
  const descriptionParagraphs = description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const highlightsList = highlights
    .split('\n')
    .map((h) => h.trim())
    .filter(Boolean)
  const programList = program
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  function handleImageSelected(fileList: FileList | null) {
    const raw = fileList?.[0]
    if (!raw) return
    setUploadError(null)
    const invalid = validateInputFile(raw)
    if (invalid) {
      setUploadError(invalid)
      if (imageInputRef.current) imageInputRef.current.value = ''
      return
    }
    // Najpierw kadrowanie na lokalnym podglądzie, dopiero potem wysyłka.
    setCropSrc(URL.createObjectURL(raw))
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  /** Ponowne kadrowanie już wgranego zdjęcia (adres z Supabase Storage). */
  function handleRecrop() {
    if (!image) return
    setUploadError(null)
    setCropSrc(image)
  }

  function closeCropper() {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  /** Odbiera wykadrowany plik WebP 16:9 i wgrywa go do Storage. */
  async function handleCropConfirm(file: File) {
    setImageUploading(true)
    setUploadError(null)
    try {
      const { src } = await uploadArticleImage(file)
      setImage(src)
      closeCropper()
    } catch (err) {
      setUploadError(
        'Nie udało się wgrać zdjęcia. ' + (err instanceof Error ? err.message : ''),
      )
    } finally {
      setImageUploading(false)
    }
  }

  return (
    <form action={formAction} className="grid min-w-0 gap-6">
      {event?.id && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="image" value={image} />

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
          <label htmlFor="title" className="text-sm font-medium">
            Tytuł
          </label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass(!!errors.title)}
            placeholder="np. Piknik Rodzinny w Jejkowicach"
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="event_date" className="text-sm font-medium">
              Data
            </label>
            <input
              id="event_date"
              name="event_date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={fieldClass(!!errors.event_date)}
            />
            {errors.event_date && <p className="text-xs text-destructive">{errors.event_date}</p>}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="event_time" className="text-sm font-medium">
              Godzina
            </label>
            <input
              id="event_time"
              name="event_time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className={fieldClass(!!errors.event_time)}
              placeholder="np. 15:00"
            />
            {errors.event_time && <p className="text-xs text-destructive">{errors.event_time}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="place" className="text-sm font-medium">
              Miejsce
            </label>
            <input
              id="place"
              name="place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={fieldClass(!!errors.place)}
              placeholder="np. Skwer w centrum"
            />
            {errors.place && <p className="text-xs text-destructive">{errors.place}</p>}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="address" className="text-sm font-medium">
              Adres <span className="text-muted-foreground">(opcjonalnie)</span>
            </label>
            <input
              id="address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={fieldClass()}
              placeholder="np. przy ul. Głównej"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="organizer" className="text-sm font-medium">
            Organizator
          </label>
          <input
            id="organizer"
            name="organizer"
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            className={fieldClass()}
            placeholder="np. Urząd Gminy Jejkowice"
          />
          <p className="text-xs text-muted-foreground">
            Domyślnie „Urząd Gminy Jejkowice”. Wpisz inną nazwę, jeśli wydarzenie organizuje ktoś
            inny.
          </p>
        </div>

        {/* Plakat / zdjęcie wydarzenia — kadrowanie 3:4 + kompresja do WebP */}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Plakat / zdjęcie</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative aspect-[3/4] w-full max-w-[13rem] shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image || '/placeholder.svg'}
                    alt="Podgląd zdjęcia wydarzenia"
                    className="size-full object-cover"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRecrop}
                      aria-label="Kadruj ponownie zdjęcie wydarzenia"
                      className="flex size-8 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
                    >
                      <Crop className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      aria-label="Usuń zdjęcie wydarzenia"
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
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => handleImageSelected(e.target.files)}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {imageUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                {image ? 'Zmień zdjęcie' : 'Wybierz zdjęcie'}
              </button>
              {image && (
                <button
                  type="button"
                  onClick={handleRecrop}
                  disabled={imageUploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Crop className="size-4" />
                  Kadruj ponownie
                </button>
              )}
              <p className="max-w-xs text-xs text-muted-foreground text-pretty">
                JPEG, PNG lub WebP. Po wybraniu otworzy się okno kadrowania — zdjęcie zostaje
                przycięte do proporcji 3:4 (pionowy plakat) i zapisane jako WebP, więc mało waży.
              </p>
              {uploadError && <p className="max-w-xs text-xs text-destructive">{uploadError}</p>}
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="intro" className="text-sm font-medium">
            Krótki opis (hasło na kartę)
          </label>
          <textarea
            id="intro"
            name="intro"
            rows={2}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            className={fieldClass(!!errors.intro)}
            placeholder="Jedno zdanie zachęcające do udziału."
          />
          {errors.intro && <p className="text-xs text-destructive">{errors.intro}</p>}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Pełny opis <span className="text-muted-foreground">(obsługuje Markdown)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(fieldClass(), 'font-mono text-[13px] leading-relaxed')}
            placeholder={
              '## Podtytuł\n\nZwykły akapit z **pogrubieniem** i *kursywą*.\n\n- punkt pierwszy\n- punkt drugi\n\n[Więcej informacji](https://jejkowice.pl)'
            }
          />
          <p className="text-xs text-muted-foreground text-pretty">
            Możesz używać Markdown: <code>## nagłówek</code>, <code>**pogrubienie**</code>,{' '}
            <code>*kursywa*</code>, listy <code>-</code>, cytaty <code>&gt;</code> oraz odnośniki{' '}
            <code>[tekst](adres)</code>. Akapity oddziel pustą linią. Kliknij „Podgląd", aby
            zobaczyć efekt.
          </p>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">
            Co na Ciebie czeka? <span className="text-muted-foreground">(opcjonalnie)</span>
          </span>
          <input type="hidden" name="highlights" value={highlights} />
          <HighlightsEditor
            initial={event?.highlights ?? []}
            onChange={setHighlights}
          />
          <p className="text-xs text-muted-foreground">
            Każda atrakcja ma własną ikonę — kliknij kafelek z ikoną po lewej, aby ją zmienić.
            Wybierz „Auto", jeśli ikona ma być dobrana automatycznie.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="program" className="text-sm font-medium">
            Program wydarzenia <span className="text-muted-foreground">(opcjonalnie)</span>
          </label>
          <textarea
            id="program"
            name="program"
            rows={6}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className={fieldClass()}
            placeholder={'15:00 Rozpoczęcie wydarzenia\n15:30 Występ zespołu Green Tea\n19:00 Koncert Margaret'}
          />
          <p className="text-xs text-muted-foreground">
            Każdy punkt w osobnej linii: godzina + opis, np. „15:00 Rozpoczęcie”.
          </p>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">
            Lokalizacja na mapie <span className="text-muted-foreground">(opcjonalnie)</span>
          </span>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            parkings={parkings}
            addressHint={[address, place, 'Jejkowice'].filter(Boolean).join(', ')}
            onChange={(lat, lng) => {
              setLatitude(lat)
              setLongitude(lng)
            }}
            onParkingsChange={setParkings}
          />
          <p className="text-xs text-muted-foreground">
            Wyszukaj adres lub kliknij na mapie, aby ustawić pinezkę. Mapa doda się automatycznie na
            stronie wydarzenia.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              name="free"
              checked={free}
              onChange={(e) => setFree(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="text-sm font-medium">Wstęp bezpłatny</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              name="published"
              defaultChecked={event?.published ?? true}
              className="size-4 accent-primary"
            />
            <span className="text-sm font-medium">Widoczne publicznie</span>
          </label>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Kliknij
          <span className="font-medium text-foreground"> „Podgląd”</span>, aby zobaczyć, jak
          wydarzenie będzie wyglądało na stronie gminy.
        </p>
      </div>

      {/* --- PREVIEW TAB --- */}
      <div className={cn('min-w-0', tab !== 'preview' && 'hidden')}>
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          Tak zobaczą wydarzenie mieszkańcy.
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background">
          <EventView
            preview
            title={title}
            image={image}
            dateLabel={formatEventLongDate(eventDate)}
            time={eventTime}
            place={place}
            address={address}
            free={free}
            description={descriptionParagraphs}
            highlights={highlightsList}
            program={programList}
            latitude={latitude ?? undefined}
            longitude={longitude ?? undefined}
            parkings={parkings}
            organizer={organizer}
          />
        </div>
      </div>

      {cropSrc && (
        <CoverImageCropper
          imageSrc={cropSrc}
          onCancel={closeCropper}
          onConfirm={handleCropConfirm}
          aspect={3 / 4}
          title="Wykadruj zdjęcie wydarzenia"
          baseName="wydarzenie"
        />
      )}

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/admin/wydarzenia"
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Anuluj
        </Link>
      </div>
    </form>
  )
}
