import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PollForm } from '@/components/admin/poll-form'

export const metadata: Metadata = {
  title: 'Nowa ankieta — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export default function NewPollPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/ankiety"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Wróć do ankiet
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Nowa ankieta</h1>
      </div>
      <PollForm />
    </div>
  )
}
