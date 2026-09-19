import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { eventLongDate, isPastEvent, parseEventDate } from "@/lib/data"
import { getPublicEventBySlug, getPublicEvents } from "@/lib/events"
import { EventView } from "@/components/events/event-view"

type Params = { params: Promise<{ id: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const event = await getPublicEventBySlug(id)
  if (!event) return { title: "Wydarzenie | Jejkowice — nasza gmina!" }
  return {
    title: `${event.title} | Jejkowice — nasza gmina!`,
    description: event.intro,
  }
}

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params
  const event = await getPublicEventBySlug(id)
  if (!event) notFound()

  const weekday = eventLongDate(event).split(",")[0]

  // „Inne wydarzenia" — najpierw nadchodzące, potem pozostałe, bez bieżącego.
  const all = await getPublicEvents()
  const others = all.filter((e) => e.id !== event.id)
  const upcoming = others
    .filter((e) => !isPastEvent(e))
    .sort((a, b) => parseEventDate(a.date).jsDate.getTime() - parseEventDate(b.date).jsDate.getTime())
  const past = others
    .filter((e) => isPastEvent(e))
    .sort((a, b) => parseEventDate(b.date).jsDate.getTime() - parseEventDate(a.date).jsDate.getTime())
  const otherEvents = [...upcoming, ...past].slice(0, 4)

  return (
    <EventView
      slug={event.id}
      title={event.title}
      image={event.image}
      dateLabel={eventLongDate(event)}
      weekday={weekday}
      time={event.time}
      place={event.place}
      address={event.address}
      free={event.free}
      intro={event.intro}
      description={event.description}
      highlights={event.highlights}
      program={event.program}
      latitude={event.latitude}
      longitude={event.longitude}
      parkings={event.parkings}
      organizer={event.organizer}
      otherEvents={otherEvents}
    />
  )
}
