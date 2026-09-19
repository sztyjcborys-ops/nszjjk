'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Clock, ArrowRight, CalendarDays } from 'lucide-react'
import { type EventItem, eventDay, eventMonthShort, isPastEvent, parseEventDate } from '@/lib/data'

/**
 * Karuzela nadchodzących wydarzeń — karty w proporcji 3:4 (ten sam kadr,
 * co w panelu), przewijane w poziomie ze snapowaniem. Kropki pod karuzelą
 * pokazują aktualną pozycję.
 */
export function EventsCarousel({ items }: { items: EventItem[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  // Najbliższe (nadchodzące) wydarzenia jako pierwsze — rosnąco wg daty,
  // a wydarzenia zakończone trafiają na koniec (od ostatnio zakończonych).
  const ordered = [...items].sort((a, b) => {
    const pastA = isPastEvent(a)
    const pastB = isPastEvent(b)
    if (pastA !== pastB) return pastA ? 1 : -1
    const timeA = parseEventDate(a.date).jsDate.getTime()
    const timeB = parseEventDate(b.date).jsDate.getTime()
    return pastA ? timeB - timeA : timeA - timeB
  })

  const syncActive = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const cards = Array.from(track.children) as HTMLElement[]
    if (cards.length === 0) return
    const center = track.scrollLeft + track.clientWidth / 2
    let nearest = 0
    let smallest = Number.POSITIVE_INFINITY
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
      if (distance < smallest) {
        smallest = distance
        nearest = index
      }
    })
    setActive(nearest)
  }, [])

  useEffect(() => {
    syncActive()
  }, [syncActive])

  const goTo = (index: number) => {
    const track = trackRef.current
    const card = track?.children[index] as HTMLElement | undefined
    if (!track || !card) return
    // Odejmujemy scroll-padding (1rem = 16px), aby karta zatrzymała się
    // w tej samej pozycji co przy swipowaniu — równo z nagłówkiem sekcji.
    track.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-navy-foreground/25 p-8 text-center text-sm text-navy-foreground/70">
        Brak zaplanowanych wydarzeń.
      </p>
    )
  }

  return (
    <div>
      <ul
        ref={trackRef}
        onScroll={syncActive}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 pl-4 pr-4 scroll-pl-4 [scrollbar-width:none] md:mx-0 md:pl-0 md:pr-0 md:scroll-pl-0 [&::-webkit-scrollbar]:hidden"
      >
        {ordered.map((item) => (
          <li
            key={item.id}
            className="w-[63%] min-w-[10.5rem] max-w-[15rem] shrink-0 snap-start sm:w-[42%] md:w-[31%]"
          >
            <EventPosterCard item={item} />
          </li>
        ))}
      </ul>

      {ordered.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {ordered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Przejdź do wydarzenia ${index + 1}`}
              aria-current={index === active}
              className={`h-1.5 rounded-full transition-all ${
                index === active
                  ? 'w-6 bg-navy-foreground'
                  : 'w-1.5 bg-navy-foreground/35 hover:bg-navy-foreground/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventPosterCard({ item }: { item: EventItem }) {
  // `rowToEventItem` podstawia '/placeholder.svg', gdy wydarzenie nie ma zdjęcia.
  const hasImage = Boolean(item.image) && item.image !== '/placeholder.svg'
  const past = isPastEvent(item)

  return (
    <Link
      href={`/wydarzenia/${item.id}`}
      prefetch={false}
      aria-label={past ? `${item.title} — wydarzenie zakończone` : item.title}
      className={`group relative flex h-full flex-col rounded-2xl bg-surface shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-foreground ${
        past ? 'opacity-60 saturate-50' : ''
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-secondary">
        {hasImage ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 768px) 15rem, 63vw"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              past ? 'grayscale' : ''
            }`}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <CalendarDays className="size-8" />
          </span>
        )}

        {past && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-navy/85 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-navy-foreground shadow-sm">
            Zakończone
          </span>
        )}

        {/* Fala w kolorze karty — dolny pasek "zjada" zdjęcie łagodnym łukiem. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 32"
          preserveAspectRatio="none"
          className="absolute inset-x-0 -bottom-px h-12 w-full text-surface"
        >
          <path
            d="M0 13 C 22 -6, 56 24, 88 7 C 102 -1, 113 3, 120 7 L120 33 L0 33 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Plakietka z datą — ~3/4 na grafice, ~1/4 na dolnym panelu. */}
      <span className="absolute left-3 top-[calc(75%-3.5rem)] z-10 flex size-[3.25rem] flex-col items-center justify-center rounded-xl bg-surface shadow-[0_6px_16px_-4px_oklch(0.23_0.03_262/0.35)]">
        <span className="text-lg font-extrabold leading-none text-primary">{eventDay(item)}</span>
        <span className="text-[0.6rem] font-bold uppercase leading-tight tracking-wider text-primary">
          {eventMonthShort(item)}
        </span>
      </span>

      <div className="-mt-2 flex flex-1 flex-col gap-1 rounded-b-2xl bg-surface px-3 pb-2.5 pt-1">
        {/* Tytuł w jednym rzędzie z plakietką daty — niewielki odstęp po lewej. */}
        <h3 className="ml-1 text-pretty text-base font-bold leading-snug">{item.title}</h3>

        <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{item.place}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" />
            {item.time}
          </span>
        </div>
      </div>
    </Link>
  )
}
