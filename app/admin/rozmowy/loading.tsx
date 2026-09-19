import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid min-w-0 gap-6">
      {/* Nagłówek */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-40 max-w-full md:h-9" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 max-w-full self-start rounded-xl sm:self-auto" />
      </div>

      {/* Wyszukiwarka */}
      <Skeleton className="h-11 w-full rounded-2xl" />

      {/* Filtry zakresu dat */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Lista rozmów */}
      <ul className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
              <Skeleton className="size-5 shrink-0 rounded" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
