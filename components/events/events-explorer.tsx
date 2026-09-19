'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type EventItem, isPastEvent, parseEventDate } from '@/lib/data'

const WEEKDAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
const MONTHS_UPPER = [
  'STYCZEŃ',
  'LUTY',
  'MARZEC',
  'KWIECIEŃ',
  'MAJ',
  'CZERWIEC',
  'LIPIEC',
  'SIERPIEŃ',
  'WRZESIEŃ',
  'PAŹDZIERNIK',
  'LISTOPAD',
  'GRUDZIEŃ',
]
const MONTHS_SHORT = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU']
const MONTHS_GENITIVE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
]

/** Klucz 'YYYY-MM-DD' w czasie lokalnym — spójny z formatem daty wydarzenia. */
function toKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Poniedziałek tygodnia, w którym leży podana data. */
function startOfWeek(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const shift = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - shift)
  return copy
}

function addDays(d: Date, days: number) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() + days)
  return copy
}

export function EventsExplorer({ events = [] }: { events?: EventItem[] }) {
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [monthCursor, setMonthCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [selectedKey, setSelectedKey] = useState(() => toKey(today))
  const [calendarOpen, setCalendarOpen] = useState(false)

  /** Wydarzenia pogrupowane po dniu ('YYYY-MM-DD'). */
  const eventsByKey = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const event of events) {
      const list = map.get(event.date) ?? []
      list.push(event)
      map.set(event.date, list)
    }
    return map
  }, [events])

  const upcoming = useMemo(
    () =>
      events
        .filter((event) => !isPastEvent(event))
        .sort(
          (a, b) => parseEventDate(a.date).jsDate.getTime() - parseEventDate(b.date).jsDate.getTime(),
        ),
    [events],
  )

  // Minione wydarzenia — najnowsze na górze.
  const past = useMemo(
    () =>
      events
        .filter((event) => isPastEvent(event))
        .sort(
          (a, b) => parseEventDate(b.date).jsDate.getTime() - parseEventDate(a.date).jsDate.getTime(),
        ),
    [events],
  )

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  // Zamknięty pasek pokazuje miesiąc widocznego tygodnia, otwarty — miesiąc kalendarza.
  const labelDate = calendarOpen ? new Date(monthCursor.year, monthCursor.month, 1) : addDays(weekStart, 3)
  const label = `${MONTHS_UPPER[labelDate.getMonth()]} ${labelDate.getFullYear()}`

  const shift = (direction: -1 | 1) => {
    if (calendarOpen) {
      setMonthCursor(({ year, month }) => {
        const next = new Date(year, month + direction, 1)
        return { year: next.getFullYear(), month: next.getMonth() }
      })
      return
    }
    setWeekStart((current) => {
      const next = addDays(current, direction * 7)
      const mid = addDays(next, 3)
      setMonthCursor({ year: mid.getFullYear(), month: mid.getMonth() })
      return next
    })
  }

  const toggleCalendar = () => {
    setCalendarOpen((open) => {
      if (!open) {
        const mid = addDays(weekStart, 3)
        setMonthCursor({ year: mid.getFullYear(), month: mid.getMonth() })
      }
      return !open
    })
  }

  /** Wybór dnia w pełnym kalendarzu przewija pasek tygodnia i zwija kalendarz. */
  const pickFromCalendar = (day: number) => {
    const picked = new Date(monthCursor.year, monthCursor.month, day)
    setSelectedKey(toKey(picked))
    setWeekStart(startOfWeek(picked))
    setCalendarOpen(false)
  }

  const firstWeekday = (new Date(monthCursor.year, monthCursor.month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(monthCursor.year, monthCursor.month + 1, 0).getDate()
  const monthCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedEvents = eventsByKey.get(selectedKey) ?? []
  const selectedDate = parseEventDate(selectedKey)
  const selectedLabel = `${selectedDate.day} ${MONTHS_GENITIVE[selectedDate.monthIndex]}`
  const listed = selectedEvents.length > 0 ? selectedEvents : upcoming

  return (
    <div>
      {/* Pasek nawigacji miesiąca + przycisk pełnego kalendarza */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label={calendarOpen ? 'Poprzedni miesiąc' : 'Poprzedni tydzień'}
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-extrabold tracking-wide">{label}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={calendarOpen ? 'Następny miesiąc' : 'Następny tydzień'}
          className="ml-auto flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="size-5" />
        </button>
        <button
          type="button"
          onClick={toggleCalendar}
          aria-expanded={calendarOpen}
          aria-label={calendarOpen ? 'Zwiń kalendarz' : 'Otwórz pełny kalendarz'}
          className={cn(
            'flex size-10 items-center justify-center rounded-xl transition-colors',
            calendarOpen
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-primary hover:bg-secondary/70',
          )}
        >
          <CalendarDays className="size-5" />
        </button>
      </div>

      {/* Pasek dni bieżącego tygodnia */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const key = toKey(day)
          const isSelected = key === selectedKey
          const hasEvent = eventsByKey.has(key)
          const isToday = key === toKey(today)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary',
              )}
            >
              <span
                className={cn(
                  'text-[0.7rem] font-semibold',
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {WEEKDAYS_SHORT[(day.getDay() + 6) % 7]}
              </span>
              <span
                className={cn(
                  'text-base font-extrabold leading-none',
                  !isSelected && isToday && 'text-primary',
                )}
              >
                {day.getDate()}
              </span>
              {hasEvent && (
                <span
                  aria-hidden
                  className={cn(
                    'size-1 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-accent',
                  )}
                />
              )}
              {!hasEvent && <span aria-hidden className="size-1" />}
            </button>
          )
        })}
      </div>

      {/* Pełny kalendarz — rozwijany z animacją (grid-rows 0fr → 1fr) */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          calendarOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="mb-1 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS_SHORT.map((day) => (
                <span key={day} className="text-[0.7rem] font-semibold text-muted-foreground">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} />
                const key = toKey(new Date(monthCursor.year, monthCursor.month, day))
                const isSelected = key === selectedKey
                const isToday = key === toKey(today)
                const hasEvent = eventsByKey.has(key)
                return (
                  <button
                    key={key}
                    type="button"
                    tabIndex={calendarOpen ? 0 : -1}
                    onClick={() => pickFromCalendar(day)}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                      isSelected && 'bg-primary text-primary-foreground',
                      isToday && !isSelected && 'text-primary ring-2 ring-inset ring-primary/50',
                      !isSelected && !isToday && 'hover:bg-secondary',
                    )}
                  >
                    {day}
                    {hasEvent && (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute bottom-1 size-1 rounded-full',
                          isSelected ? 'bg-primary-foreground' : 'bg-accent',
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lista wydarzeń: wybrany dzień albo najbliższe terminy */}
      <section className="mt-6">
        <h2 className="text-lg font-extrabold tracking-tight md:text-xl">
          {selectedEvents.length > 0 ? `Wydarzenia ${selectedLabel}` : 'Nadchodzące wydarzenia'}
        </h2>
        {selectedEvents.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming.length > 0
              ? `Brak wydarzeń ${selectedLabel} — poniżej najbliższe terminy.`
              : 'Nie ma jeszcze zaplanowanych wydarzeń. Zajrzyj tu wkrótce!'}
          </p>
        )}

        {listed.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3">
            {listed.map((event) => (
              <li key={event.id}>
                <EventRow item={event} variant="upcoming" />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={toggleCalendar}
          aria-expanded={calendarOpen}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
        >
          {calendarOpen ? 'Zwiń kalendarz' : 'Zobacz pełny kalendarz'}
          <ArrowRight
            className={cn('size-4 transition-transform duration-300', calendarOpen && '-rotate-90')}
          />
        </button>
      </section>

      {/* Minione wydarzenia — pokazywane pod kalendarzem */}
      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-extrabold tracking-tight md:text-xl">Minione wydarzenia</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Zajrzyj do archiwum zakończonych wydarzeń w naszej gminie.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {past.map((event) => (
              <li key={event.id}>
                <EventRow item={event} variant="past" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * Wiersz wydarzenia: plakietka z datą, opis i miniaturka.
 * variant="upcoming" — nieco większy, z pomarańczowym odcieniem daty.
 * variant="past" — delikatnie mniejszy, wyszarzony.
 */
function EventRow({ item, variant = 'upcoming' }: { item: EventItem; variant?: 'upcoming' | 'past' }) {
  const hasImage = Boolean(item.image) && item.image !== '/placeholder.svg'
  const { day, monthIndex } = parseEventDate(item.date)
  const past = isPastEvent(item)
  const isUpcoming = variant === 'upcoming'

  return (
    <Link
      href={`/wydarzenia/${item.id}`}
      prefetch={false}
      className={cn(
        'group flex items-center rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isUpcoming ? 'gap-3.5 p-3' : 'gap-2.5 p-2',
        past && 'opacity-70',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 flex-col items-center justify-center rounded-xl',
          isUpcoming ? 'size-16 bg-accent/20 text-accent-foreground' : 'size-12 bg-secondary/70 text-primary',
        )}
      >
        <span className={cn('font-extrabold leading-none', isUpcoming ? 'text-2xl' : 'text-lg')}>{day}</span>
        <span
          className={cn(
            'mt-0.5 font-bold uppercase tracking-wider',
            isUpcoming ? 'text-[0.65rem]' : 'text-[0.55rem]',
          )}
        >
          {MONTHS_SHORT[monthIndex]}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-pretty font-bold leading-snug',
            isUpcoming ? 'text-base' : 'text-sm',
          )}
        >
          {item.title}
        </span>
        {isUpcoming ? (
          <>
            <span className="mt-1.5 block truncate text-xs text-muted-foreground">{item.place}</span>
            <span className="mt-1 block truncate text-xs font-semibold text-accent-foreground">
              {item.time}
            </span>
          </>
        ) : (
          <span className="mt-1 block truncate text-[0.7rem] text-muted-foreground">
            {item.place} <span aria-hidden>•</span> {item.time}
          </span>
        )}
      </span>

      <span
        className={cn(
          'relative shrink-0 overflow-hidden rounded-xl bg-secondary',
          isUpcoming ? 'size-16' : 'size-12',
        )}
      >
        {hasImage ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes={isUpcoming ? '4rem' : '3rem'}
            className={cn(
              'object-cover transition-transform duration-300 group-hover:scale-105',
              past && 'grayscale',
            )}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <CalendarDays className={isUpcoming ? 'size-6' : 'size-5'} />
          </span>
        )}
      </span>
    </Link>
  )
}
