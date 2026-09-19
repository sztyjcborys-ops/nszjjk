import type { Metadata } from 'next'
import { EventsExplorer } from '@/components/events/events-explorer'
import { getPublicEvents } from '@/lib/events'

export const metadata: Metadata = {
  title: 'Wydarzenia | Jejkowice — nasza gmina!',
  description:
    'Kalendarz nadchodzących wydarzeń w gminie Jejkowice — pikniki, zawody, imprezy dla mieszkańców.',
}

export const revalidate = 300

export default async function WydarzeniaPage() {
  const events = await getPublicEvents()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Wydarzenia</h1>

      <div className="mt-5 md:mt-6">
        <EventsExplorer events={events} />
      </div>
    </div>
  )
}
