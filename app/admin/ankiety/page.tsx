import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Pencil, Trash2, BarChart3, Users, Clock, Play, Pause } from 'lucide-react'
import { getAdminPolls, pollDaysLeft } from '@/lib/polls'
import { deletePollAction, togglePollStatusAction } from './actions'
import { PendingIconButton } from '@/components/admin/pending-icon-button'

export const metadata: Metadata = {
  title: 'Ankiety — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminPollsPage() {
  const polls = await getAdminPolls()

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Ankiety</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {polls.length} {polls.length === 1 ? 'ankieta' : 'pozycji'} · konsultacje z mieszkańcami
          </p>
        </div>
        <Link
          href="/admin/ankiety/nowa"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:self-auto"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nowa ankieta</span>
          <span className="sm:hidden">Nowa</span>
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <BarChart3 className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Brak ankiet</h2>
          <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            Utwórz pierwszą ankietę, aby poznać opinię mieszkańców.
          </p>
          <Link
            href="/admin/ankiety/nowa"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Dodaj ankietę
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {polls.map((p) => {
            const days = pollDaysLeft(p)
            const active = p.status === 'Aktywna'
            const nextStatus = active ? 'Zakończona' : 'Aktywna'
            return (
              <li
                key={p.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-sm sm:gap-4"
              >
                <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
                  <Image
                    src={p.image || '/placeholder.svg'}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                        active ? 'bg-eco/15 text-eco' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {active ? 'Aktywna' : 'Zakończona'}
                    </span>
                    {days !== null && (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground">
                        <Clock className="size-3" />
                        do końca: {days} dni
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 truncate text-sm font-semibold sm:text-base">{p.title}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="size-3.5" />
                      {p.optionsCount} {p.optionsCount === 1 ? 'odpowiedź' : 'odpowiedzi'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {p.totalVotes} {p.totalVotes === 1 ? 'głos' : 'głosów'}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <form action={togglePollStatusAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={nextStatus} />
                    <PendingIconButton
                      aria-label={active ? 'Zakończ ankietę' : 'Wznów ankietę'}
                      className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
                        active
                          ? 'text-amber-500 hover:bg-amber-500/10 hover:text-amber-600'
                          : 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600'
                      }`}
                    >
                      {active ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </PendingIconButton>
                  </form>
                  <Link
                    href={`/admin/ankiety/${p.id}`}
                    aria-label="Edytuj"
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <form action={deletePollAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <PendingIconButton
                      aria-label="Usuń"
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </PendingIconButton>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
