import Image from 'next/image'
import Link from 'next/link'
import { marked } from 'marked'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Ticket,
} from 'lucide-react'
import { type EventItem, eventDay, eventMonthShort } from '@/lib/data'
import { parseHighlight, resolveHighlightIcon } from '@/lib/event-highlight-icons'
import { EventMap } from '@/components/events/event-map'
import type { ParkingSpot } from '@/lib/parkings'
import { EventShare } from '@/components/events/event-share'

export type EventViewProps = {
  slug?: string
  title: string
  image?: string | null
  /** Sformatowana, długa data, np. „niedziela, 30 sierpnia 2026". */
  dateLabel: string
  /** Krótki dzień tygodnia, np. „niedziela". */
  weekday?: string
  time: string
  place: string
  address?: string | null
  free?: boolean
  intro?: string
  description: string[]
  highlights?: string[]
  /** Program wydarzenia — pozycje w formacie 'HH:MM|Opis'. */
  program?: string[]
  /** Współrzędne pinezki (opcjonalne). */
  latitude?: number
  longitude?: number
  /** Pozostałe wydarzenia do sekcji „Zobacz także". */
  otherEvents?: EventItem[]
  /** Parkingi tego wydarzenia — pokazywane na mapie obok pinezki docelowej. */
  parkings?: ParkingSpot[]
  /** Organizator wydarzenia; domyślnie „Urząd Gminy Jejkowice". */
  organizer?: string
  /** W trybie podglądu odnośniki są nieaktywne. */
  preview?: boolean
}

/** Rozbija pozycję programu 'HH:MM|Opis' (albo 'HH:MM Opis') na czas + opis. */
function parseProgramItem(raw: string): { time: string; label: string } {
  const line = raw.trim()
  const pipe = line.indexOf('|')
  if (pipe >= 0) {
    return { time: line.slice(0, pipe).trim(), label: line.slice(pipe + 1).trim() }
  }
  const m = line.match(/^(\d{1,2}[:.]\d{2})\s+(.*)$/)
  if (m) return { time: m[1].replace('.', ':'), label: m[2].trim() }
  return { time: '', label: line }
}

export function EventView({
  slug = '',
  title,
  image,
  dateLabel,
  weekday,
  time,
  place,
  address,
  free,
  intro,
  description,
  highlights = [],
  program = [],
  latitude,
  longitude,
  otherEvents = [],
  parkings = [],
  organizer,
  preview,
}: EventViewProps) {
  const organizerName = organizer?.trim() || 'Urząd Gminy Jejkowice'
  const isGminaOrganizer =
    organizerName.toLowerCase() === 'urząd gminy jejkowice'
  const fullAddress = address ? `${place}, ${address}` : place
  const hasPin = typeof latitude === 'number' && typeof longitude === 'number'
  const mapsHref = hasPin
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
  const hasImage = Boolean(image) && image !== '/placeholder.svg'

  const meta = [
    { icon: CalendarDays, label: weekday || 'Termin', value: dateLabel || 'Data wydarzenia' },
    { icon: Clock, label: 'Godzina', value: time || '—' },
    { icon: MapPin, label: place || 'Miejsce', value: address || 'Jejkowice' },
  ]

  const programItems = program.map(parseProgramItem).filter((p) => p.time || p.label)

  // Opis wspiera Markdown — akapity z bazy łączymy z powrotem w źródło i renderujemy.
  const descriptionSource = description.join('\n\n').trim()
  const descriptionHtml = descriptionSource
    ? (marked.parse(descriptionSource, { async: false, gfm: true, breaks: true }) as string)
    : ''

  const backClass =
    'inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 md:py-10">
      {preview ? (
        <span className={backClass}>
          <ArrowLeft className="size-4" />
          Wróć do wydarzeń
        </span>
      ) : (
        <Link href="/wydarzenia" className={backClass}>
          <ArrowLeft className="size-4" />
          Wróć do wydarzeń
        </Link>
      )}

      {/* Hero: plakat + kluczowe informacje w jednej miękkiej karcie */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-secondary/40 p-3 md:p-4">
        <div className="overflow-hidden rounded-2xl bg-card">
          {hasImage ? (
            <Image
              src={image as string}
              alt={`Plakat wydarzenia: ${title}`}
              width={1200}
              height={1600}
              sizes="(min-width: 768px) 42rem, 100vw"
              className="aspect-[3/4] w-full object-cover"
              priority={!preview}
              unoptimized={preview}
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              Brak plakatu
            </div>
          )}
        </div>

        <dl className="mt-2.5 overflow-hidden rounded-xl bg-card/70 md:mt-3">
          {meta.map((m, i) => (
            <div
              key={m.label}
              className={`flex items-center gap-2.5 px-2.5 py-2 md:gap-3 md:px-3 md:py-2.5 ${
                i > 0 ? 'border-t border-border/60' : ''
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/25 text-accent-foreground md:size-9">
                <m.icon className="size-4 md:size-4.5" />
              </span>
              <div className="min-w-0">
                <dd className="truncate text-[13px] font-bold leading-snug md:text-sm">{m.value}</dd>
                <dt className="truncate text-[10px] uppercase tracking-wide text-muted-foreground md:text-[11px]">
                  {m.label}
                </dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* Tytuł */}
      <div className="mt-4 md:mt-5">
        <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
          Wydarzenie
        </span>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-balance md:mt-2.5 md:text-4xl">
          {title || 'Tytuł wydarzenia'}
        </h1>
        {intro && (
          <p className="mt-1.5 text-pretty text-sm text-muted-foreground md:text-base">{intro}</p>
        )}
        {free && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-3 py-1 text-xs font-bold text-eco">
            <Ticket className="size-3.5" />
            Wstęp bezpłatny
          </span>
        )}
      </div>

      {/* Co na Ciebie czeka? */}
      {highlights.length > 0 && (
        <section className="mt-6 md:mt-8">
          <h2 className="text-base font-extrabold tracking-tight md:text-lg">Co na Ciebie czeka?</h2>
          <ul className="mt-4 grid grid-cols-3 gap-y-5 md:mt-5 md:grid-cols-6 md:gap-y-0">
            {highlights.map((h, i) => {
              const { iconKey, label } = parseHighlight(h)
              const Icon = resolveHighlightIcon(iconKey, i)
              return (
                <li
                  key={`${h}-${i}`}
                  className="flex flex-col items-center gap-2 px-2 text-center [&:not(:nth-child(3n+1))]:border-l [&:not(:nth-child(3n+1))]:border-border md:[&:not(:nth-child(3n+1))]:border-l-0 md:[&:not(:first-child)]:border-l"
                >
                  <Icon className="size-5 text-accent md:size-6" strokeWidth={2} aria-hidden="true" />
                  <span className="text-[11px] font-medium leading-snug text-pretty text-foreground md:text-xs">
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* O wydarzeniu — treść w formacie Markdown */}
      {descriptionHtml && (
        <section className="mt-6 md:mt-8">
          <h2 className="text-base font-extrabold tracking-tight md:text-lg">O wydarzeniu</h2>
          <div
            className="article-prose mt-3 max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </section>
      )}

      {/* Program wydarzenia */}
      {programItems.length > 0 && (
        <section className="mt-6 md:mt-8">
          <h2 className="text-base font-extrabold tracking-tight md:text-lg">Program wydarzenia</h2>
          <ol className="mt-4 border-l-2 border-accent/50 pl-5">
            {programItems.map((item, i) => (
              <li key={i} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[1.6rem] top-1 flex size-3 items-center justify-center rounded-full bg-accent ring-4 ring-background" />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  {item.time && (
                    <span className="text-sm font-extrabold tabular-nums text-foreground">
                      {item.time}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground text-pretty">{item.label}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Gdzie? — mapa osadza się automatycznie */}
      <section className="mt-6 md:mt-8">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary md:size-5" />
          <h2 className="text-base font-extrabold tracking-tight md:text-lg">Gdzie?</h2>
        </div>
        <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-card">
          <EventMap
            latitude={latitude}
            longitude={longitude}
            hasPin={hasPin}
              parkings={parkings}
              className="h-52 w-full md:h-72"
          />
          <div className="flex items-center justify-between gap-3 p-3 md:p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold md:text-base">{place || 'Jejkowice'}</div>
              {address && (
                <div className="truncate text-[11px] text-muted-foreground md:text-sm">{address}</div>
              )}
            </div>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-[11px] font-bold text-navy-foreground transition-transform hover:-translate-y-0.5 md:px-3.5 md:py-2.5 md:text-xs"
            >
              Otwórz w mapie
              <ArrowUpRight className="size-3.5 md:size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Organizator */}
      <section className="mt-6 md:mt-8">
        <h2 className="text-base font-extrabold tracking-tight md:text-lg">Organizator</h2>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-3.5 md:p-4">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
            {isGminaOrganizer ? (
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy p-1.5 md:size-11">
                <Image
                  src="/images/herb-jejkowice.png"
                  alt=""
                  width={44}
                  height={44}
                  className="size-full object-contain"
                  unoptimized
                />
              </span>
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy md:size-11">
                <Ticket className="size-5 text-navy-foreground md:size-6" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight md:text-base">
                {organizerName}
              </div>
              <div className="truncate text-xs text-muted-foreground md:text-sm">
                Organizator wydarzenia
              </div>
            </div>
          </div>
          <a
            href="tel:+48324302000"
            className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:text-primary/80 md:text-sm"
          >
            <Phone className="size-3.5 md:size-4" />
            Kontakt
          </a>
        </div>
      </section>

      {/* Udostępnij */}
      <section className="mt-6 md:mt-8">
        <h2 className="text-base font-extrabold tracking-tight md:text-lg">Udostępnij wydarzenie</h2>
        <div className="mt-3">
          <EventShare title={title} />
        </div>
      </section>

      {/* Zobacz także */}
      {otherEvents.length > 0 && (
        <section className="mt-8 md:mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold tracking-tight md:text-lg">Zobacz także</h2>
            {!preview && (
              <Link
                href="/wydarzenia"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 md:text-sm"
              >
                Zobacz wszystkie
                <ArrowRight className="size-3.5 md:size-4" />
              </Link>
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {otherEvents.map((event) => (
              <li key={event.id}>
                <OtherEventRow event={event} preview={preview} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function OtherEventRow({ event, preview }: { event: EventItem; preview?: boolean }) {
  const body = (
    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 transition-shadow hover:shadow-md md:gap-3.5 md:p-3">
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-primary md:size-14">
        <span className="text-lg font-extrabold leading-none md:text-xl">{eventDay(event)}</span>
        <span className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-wider md:text-[0.6rem]">
          {eventMonthShort(event)}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold leading-snug md:text-sm">{event.title}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground md:text-xs">
          <MapPin className="size-3 shrink-0 md:size-3.5" />
          <span className="truncate">{event.place}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground md:text-xs">
          <Ticket className="size-3 shrink-0 md:size-3.5" />
          <span className="truncate">{event.free ? 'Wstęp bezpłatny' : 'Wstęp płatny'}</span>
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </div>
  )

  if (preview) return body
  return (
    <Link href={`/wydarzenia/${event.id}`} prefetch={false}>
      {body}
    </Link>
  )
}
