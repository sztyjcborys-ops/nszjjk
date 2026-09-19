import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-6">
      {/* Nagłówek: tytuł + akcja */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-36 max-w-full md:h-9" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 max-w-full self-start rounded-xl sm:self-auto" />
      </div>

      {/* Lista ankiet — poziome karty */}
      <ul className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4"
          >
            <Skeleton className="hidden size-16 shrink-0 rounded-xl sm:block" />
            <div className="grid min-w-0 flex-1 gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {Array.from({ length: 3 }).map((_, b) => (
                <Skeleton key={b} className="size-9 rounded-lg" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
