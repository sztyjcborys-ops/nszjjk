import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-6">
      {/* Nagłówek: powrót + tytuł */}
      <div className="grid gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48 max-w-full md:h-9" />
      </div>

      {/* Przełącznik Edycja / Podgląd */}
      <Skeleton className="h-11 w-48 rounded-xl" />

      {/* Tytuł */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-3 w-3/4 max-w-full" />
      </div>

      {/* Wprowadzenie */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      {/* Kategoria */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full max-w-xs rounded-xl" />
      </div>

      {/* Autor + data */}
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>

      {/* Zdjęcie główne */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Skeleton className="aspect-[16/9] w-full max-w-sm shrink-0 rounded-2xl" />
          <div className="grid gap-2">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </div>

      {/* Treść */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      {/* Opcje publikacji */}
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />

      {/* Akcje */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-40 rounded-xl" />
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
    </div>
  )
}
