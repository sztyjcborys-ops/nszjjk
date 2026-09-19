import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      {/* Nagłówek */}
      <header className="grid gap-2">
        <Skeleton className="h-8 w-40 max-w-full md:h-9" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </header>

      <div className="flex flex-col gap-4 md:gap-5">
        {/* Wyszukiwarka */}
        <Skeleton className="h-12 w-full rounded-2xl" />

        {/* Filtry statusu */}
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Mapa */}
        <Skeleton className="h-56 w-full rounded-2xl md:h-72" />

        {/* Nagłówek listy + sortowanie */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Lista zgłoszeń */}
        <ul className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 md:gap-3.5 md:p-3.5"
            >
              <Skeleton className="size-2 shrink-0 rounded-full" />
              <Skeleton className="size-10 shrink-0 rounded-xl md:size-12" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
              <Skeleton className="size-5 shrink-0 rounded" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
