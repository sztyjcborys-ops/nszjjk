import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getEventById } from '@/lib/events'
import { EventForm } from '@/components/admin/event-form'

export const metadata: Metadata = {
  title: 'Edytuj wydarzenie — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Params) {
  const { id } = await params
  const event = await getEventById(id)
  if (!event) notFound()

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/wydarzenia"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Wróć do wydarzeń
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Edytuj wydarzenie</h1>
      </div>
      <EventForm event={event} />
    </div>
  )
}
