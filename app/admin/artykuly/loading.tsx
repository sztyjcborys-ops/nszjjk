import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      {/* Nagłówek: tytuł + akcja */}
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-40 max-w-full md:h-9" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl sm:w-36" />
      </div>

      {/* Pasek wyszukiwania + filtr */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 flex-1 rounded-2xl" />
        <Skeleton className="size-11 shrink-0 rounded-2xl" />
      </div>

      {/* Zakładki */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Lista artykułów */}
      <ul className="grid grid-cols-1 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4"
          >
            <Skeleton className="size-16 shrink-0 rounded-xl sm:size-20" />
            <div className="grid min-w-0 flex-1 gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {Array.from({ length: 4 }).map((_, b) => (
                <Skeleton key={b} className="size-8 rounded-lg" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
