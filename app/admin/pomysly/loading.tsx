import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid min-w-0 gap-6">
      {/* Nagłówek */}
      <div className="grid gap-2">
        <Skeleton className="h-8 w-44 max-w-full md:h-9" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      {/* Filtry statusu */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Lista pomysłów — karty */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-col gap-2.5 p-3.5 sm:p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="ml-auto h-4 w-10" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-4 border-t border-border pt-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border bg-muted/40 p-3">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
