import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-6">
      {/* Nagłówek: powrót + tytuł */}
      <div className="grid gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48 max-w-full md:h-9" />
      </div>

      {/* Zdjęcie */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Skeleton className="aspect-[4/3] w-full max-w-xs shrink-0 rounded-2xl" />
          <div className="grid gap-2">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </div>

      {/* Opis alternatywny */}
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      {/* Kolejność */}
      <div className="grid gap-1.5 sm:max-w-[12rem]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Widoczność */}
      <Skeleton className="h-16 w-full rounded-xl" />

      {/* Akcje */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-40 rounded-xl" />
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>
    </div>
  )
}
