import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid min-w-0 gap-6">
      {/* Nagłówek: powrót + tytuł */}
      <div className="grid gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-56 max-w-full md:h-9" />
      </div>

      {/* Przełącznik Edycja / Podgląd */}
      <Skeleton className="h-11 w-48 rounded-xl" />

      {/* Tytuł */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Data + godzina */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Miejsce + adres */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Organizator */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Plakat / zdjęcie */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Skeleton className="aspect-[3/4] w-full max-w-[13rem] shrink-0 rounded-2xl" />
          <div className="grid gap-2">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </div>

      {/* Krótki opis */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      {/* Pełny opis */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>

      {/* Program */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>

      {/* Mapa */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>

      {/* Opcje */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      {/* Akcje */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-44 rounded-xl" />
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
    </div>
  )
}
