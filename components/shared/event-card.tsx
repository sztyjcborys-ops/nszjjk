import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Clock, ArrowRight, CalendarDays } from 'lucide-react'
import { type EventItem, eventDay, eventMonthShort } from '@/lib/data'

type EventCardVariant = 'poster' | 'compact'

export function EventCard({
  item,
  variant = 'poster',
}: {
  item: EventItem
  variant?: EventCardVariant
}) {
  // `rowToEventItem` podstawia '/placeholder.svg', gdy wydarzenie nie ma zdjęcia.
  const hasImage = Boolean(item.image) && item.image !== '/placeholder.svg'

  if (variant === 'compact') {
    return (
      <Link
        href={`/wydarzenia/${item.id}`}
        prefetch={false}
        className="group relative flex overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Miniaturka w proporcji kadru z panelu (3:4). */}
        <div className="relative aspect-[3/4] w-20 shrink-0 self-stretch overflow-hidden bg-secondary sm:w-24">
          {hasImage ? (
            <Image
              src={item.image}
              alt=""
              fill
              sizes="6rem"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <CalendarDays className="size-6" />
            </span>
          )}
        </div>

        {/* Plakietka z datą na styku zdjęcia i tekstu. */}
        <div className="absolute left-[3.75rem] top-1/2 z-10 flex size-12 -translate-y-1/2 flex-col items-center justify-center rounded-xl bg-card shadow-md sm:left-[4.5rem] sm:size-14">
          <span className="text-lg font-extrabold leading-none text-primary sm:text-xl">
            {eventDay(item)}
          </span>
          <span className="text-[0.55rem] font-bold uppercase tracking-wider text-primary sm:text-[0.6rem]">
            {eventMonthShort(item)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pl-9 pr-9 sm:pl-11 sm:pr-10">
          <h3 className="text-sm font-bold leading-snug text-pretty sm:text-base">{item.title}</h3>

          <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 sm:size-4" />
              <span className="truncate">{item.place}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0 sm:size-4" />
              {item.time}
            </span>
          </div>
        </div>

        <ArrowRight className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-primary transition-transform group-hover:translate-x-0.5" />
      </Link>
    )
  }

  return (
    <Link
      href={`/wydarzenia/${item.id}`}
      prefetch={false}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Zdjęcie w tej samej proporcji, w jakiej kadrujemy w panelu (3:4). */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {hasImage ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-secondary text-muted-foreground">
            <CalendarDays className="size-8" />
          </span>
        )}

        {/* Data jako plakietka na zdjęciu. */}
        <span className="absolute left-3 top-3 flex size-12 flex-col items-center justify-center rounded-xl bg-card shadow-md sm:size-14">
          <span className="text-lg font-extrabold leading-none text-primary sm:text-xl">
            {eventDay(item)}
          </span>
          <span className="text-[0.55rem] font-bold uppercase tracking-wider text-primary sm:text-[0.6rem]">
            {eventMonthShort(item)}
          </span>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="text-sm font-bold leading-snug text-pretty sm:text-base">{item.title}</h3>

          <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 sm:size-4" />
              <span className="truncate">{item.place}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0 sm:size-4" />
              {item.time}
            </span>
          </div>
        </div>

        <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
