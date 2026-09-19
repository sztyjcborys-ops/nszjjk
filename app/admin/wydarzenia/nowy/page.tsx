import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventForm } from '@/components/admin/event-form'

export const metadata: Metadata = {
  title: 'Nowe wydarzenie — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export default function NewEventPage() {
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
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Nowe wydarzenie</h1>
      </div>
      <EventForm />
    </div>
  )
}
