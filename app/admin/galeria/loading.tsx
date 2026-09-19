import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-6">
      {/* Nagłówek: tytuł + akcja */}
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-36 max-w-full md:h-9" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl sm:w-36" />
      </div>

      {/* Siatka zdjęć — kwadratowe kafle */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-end gap-1">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
