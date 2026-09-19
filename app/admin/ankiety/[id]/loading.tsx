import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-6">
      {/* Nagłówek: powrót + tytuł */}
      <div className="grid gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48 max-w-full md:h-9" />
      </div>

      {/* Tytuł ankiety */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Opis */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      {/* Status + data zakończenia */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Zdjęcie */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Skeleton className="aspect-video w-full max-w-xs shrink-0 rounded-2xl" />
          <div className="grid gap-2">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </div>

      {/* Odpowiedzi */}
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
        <Skeleton className="mt-1 h-9 w-36 rounded-lg" />
      </div>

      {/* Podsumowanie wyników */}
      <div className="grid gap-3 rounded-2xl border border-border bg-muted/40 p-4">
        <Skeleton className="h-5 w-56 max-w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid gap-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Akcje */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-40 rounded-xl" />
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
    </div>
  )
}
