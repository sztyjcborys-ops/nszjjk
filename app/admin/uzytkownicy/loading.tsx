import { Skeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="grid gap-6">
      {/* Nagłówek strony */}
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {/* Karta „Dodaj użytkownika” */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>

      {/* Karta „Użytkownicy” */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <ul className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5"
            >
              <div className="grid min-w-0 gap-2 sm:flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="size-9 rounded-lg sm:ml-2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
