import type { Metadata } from 'next'
import { getAllIdeas } from '@/lib/ideas-server'
import { IdeasManager } from '@/components/admin/ideas-manager'

export const metadata: Metadata = {
  title: 'Pomysły — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminIdeasPage() {
  const ideas = await getAllIdeas()
  const pending = ideas.filter((i) => !i.approved).length

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Pomysły mieszkańców</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {ideas.length === 0
            ? 'Zgłoszone pomysły pojawią się tutaj do zatwierdzenia.'
            : `${ideas.length} ${ideas.length === 1 ? 'pomysł' : 'pomysłów'} · ${pending} oczekuje na zatwierdzenie`}
        </p>
      </header>

      <IdeasManager ideas={ideas} />
    </div>
  )
}
