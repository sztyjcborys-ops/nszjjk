import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid min-w-0 gap-6">
      {/* Nagłówek: powrót + akcje */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
      </div>

      {/* Status + identyfikator + tytuł */}
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-2/3 max-w-full md:h-9" />
        <Skeleton className="h-4 w-1/2 max-w-full" />
      </div>

      {/* Zdjęcia zgłoszenia */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>

      {/* Opis */}
      <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Mapa lokalizacji */}
      <Skeleton className="h-56 w-full rounded-2xl md:h-64" />

      {/* Zmiana statusu */}
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>

      {/* Notatka wewnętrzna */}
      <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  )
}
