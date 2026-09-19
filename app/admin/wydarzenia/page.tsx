import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAdminEvents, rowToEventItem } from '@/lib/events'
import {
  eventLongDate,
  eventDay,
  eventMonthShort,
  isPastEvent,
} from '@/lib/data'
import { EventsList, type EventVM } from './events-list'

export const metadata: Metadata = {
  title: 'Wydarzenia — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const events = await getAdminEvents()

  const items: EventVM[] = events.map((e) => {
    const item = rowToEventItem(e)
    return {
      id: e.id,
      title: e.title,
      place: e.place,
      published: e.published,
      free: e.free,
      image: e.image,
      dateLong: eventLongDate(item),
      time: e.event_time,
      isPast: isPastEvent(item),
      day: eventDay(item),
      monthShort: eventMonthShort(item),
      dateISO: e.event_date,
    }
  })

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Wydarzenia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} {events.length === 1 ? 'wydarzenie' : 'pozycji'} · kalendarz gminy
          </p>
        </div>
        <Link
          href="/admin/wydarzenia/nowy"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nowe wydarzenie</span>
          <span className="sm:hidden">Nowe</span>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Brak wydarzeń</h2>
          <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            Dodaj pierwsze wydarzenie, aby pojawiło się w kalendarzu gminy.
          </p>
          <Link
            href="/admin/wydarzenia/nowy"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Dodaj wydarzenie
          </Link>
        </div>
      ) : (
        <EventsList events={items} />
      )}
    </div>
  )
}
