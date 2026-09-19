import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-8">
      {/* Powitanie */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-9 w-56 max-w-full md:h-10" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-4 w-44 max-w-full shrink-0" />
      </header>

      {/* Kafelki statystyk — 6 sztuk, pionowe */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="size-10 rounded-xl" />
            <div className="grid gap-1.5">
              <Skeleton className="h-7 w-8" />
              <Skeleton className="h-3 w-20 max-w-full" />
            </div>
          </div>
        ))}
      </section>

      {/* Przegląd — tabela stanu treści */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5">
            <Skeleton className="h-3 w-16" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2.5 px-4 py-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-1 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-6 shrink-0" />
                <Skeleton className="ml-4 h-5 w-6 shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Szybkie działania */}
      <section>
        <div className="mb-3">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-4"
            >
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-3 w-20 max-w-full" />
            </div>
          ))}
        </div>
      </section>

      {/* Sekcje list: wymaga uwagi, ostatnie zgłoszenia, ostatnie artykuły */}
      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s} className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24 shrink-0" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, row) => (
              <li key={row} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <div className="grid min-w-0 flex-1 gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="size-4 shrink-0 rounded" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
