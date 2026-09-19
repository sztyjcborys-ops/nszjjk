import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPollById, getPollResults } from '@/lib/polls'
import { PollForm } from '@/components/admin/poll-form'

export const metadata: Metadata = {
  title: 'Edytuj ankietę — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function EditPollPage({ params }: Params) {
  const { id } = await params
  const poll = await getPollById(id)
  if (!poll) notFound()

  const results = await getPollResults(id)

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
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Edytuj ankietę</h1>
      </div>
      <PollForm poll={poll} results={results} />
    </div>
  )
}
