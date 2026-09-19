'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  SlidersHorizontal,
  Eye,
  Pencil,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'

export type EventVM = {
  id: string
  title: string
  place: string
  published: boolean
  free: boolean
  image: string | null
  dateLong: string
  time: string
  isPast: boolean
  day: string
  monthShort: string
  dateISO: string
}

type TabKey = 'all' | 'upcoming' | 'past' | 'drafts'

const PAGE_SIZE = 5

const tabDefs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Minione' },
  { key: 'drafts', label: 'Szkice' },
]

function matchesTab(event: EventVM, tab: TabKey): boolean {
  switch (tab) {
    case 'upcoming':
      return event.published && !event.isPast
    case 'past':
      return event.isPast
    case 'drafts':
      return !event.published
    default:
      return true
  }
}

export function EventsList({ events }: { events: EventVM[] }) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<TabKey>('all')
  const [page, setPage] = useState(1)

  const counts = useMemo(
    () => ({
      all: events.length,
      upcoming: events.filter((e) => matchesTab(e, 'upcoming')).length,
      past: events.filter((e) => matchesTab(e, 'past')).length,
      drafts: events.filter((e) => matchesTab(e, 'drafts')).length,
    }),
    [events],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events
      .filter((e) => matchesTab(e, tab))
      .filter((e) =>
        q === '' ? true : `${e.title} ${e.place}`.toLowerCase().includes(q),
      )
  }, [events, tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(start, start + PAGE_SIZE)

  function selectTab(next: TabKey) {
    setTab(next)
    setPage(1)
  }

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Szukaj wydarzeń..."
            aria-label="Szukaj wydarzeń"
            className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground"
          aria-hidden="true"
        >
          <SlidersHorizontal className="size-4" />
        </span>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabDefs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTab(t.key)}
              aria-pressed={active}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {t.label}
              <span
                className={`flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          )
        })}
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarDays className="size-6" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">Brak wydarzeń dla wybranych filtrów.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {pageItems.map((event) => (
            <li key={event.id}>
              <div className="group relative flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40 sm:gap-4 sm:p-4">
                <Link
                  href={`/admin/wydarzenia/${event.id}`}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Otwórz wydarzenie: ${event.title}`}
                />

                <div className="relative flex size-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary sm:size-20">
                  {event.image ? (
                    <Image
                      src={event.image || "/placeholder.svg"}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-xl font-bold leading-none sm:text-2xl">{event.day}</span>
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
                        {event.monthShort}
                      </span>
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {event.published ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Opublikowane
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Szkic
                      </span>
                    )}
                    {event.isPast && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Minione
                      </span>
                    )}
                    {event.free && (
                      <span className="inline-flex items-center rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-400">
                        Wstęp wolny
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1.5 line-clamp-2 text-pretty text-sm font-semibold leading-snug sm:text-base">
                    {event.title}
                  </h3>

                  <div className="mt-1.5 flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <CalendarDays className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {event.dateLong}
                        {event.time ? (
                          <>
                            {' · '}
                            <Clock className="mb-0.5 mr-0.5 inline size-3" />
                            {event.time}
                          </>
                        ) : null}
                      </span>
                    </span>
                    {event.place && (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{event.place}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 items-start gap-1">
                  <Link
                    href={`/wydarzenia`}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Podgląd"
                  >
                    <Eye className="size-4" />
                  </Link>
                  <Link
                    href={`/admin/wydarzenia/${event.id}`}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Edytuj"
                  >
                    <Pencil className="size-4" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} z {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Poprzednia strona"
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Następna strona"
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
