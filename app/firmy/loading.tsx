import { Skeleton } from "@/components/shared/skeletons"

/**
 * Szkielet podstrony „Lokalne firmy". Pojawia się natychmiast po wejściu na
 * /firmy (prefetch tej trasy jest wyłączony na stronie głównej — dane
 * ładują się dopiero po interakcji), dzięki czemu przejście jest płynne.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-12 pb-16 md:gap-16 md:pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
        {/* Nagłówek */}
        <div className="mb-8">
          <Skeleton className="mb-3 h-4 w-32 rounded-full" />
          <Skeleton className="mb-3 h-9 w-72 max-w-full rounded-2xl" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>

        {/* Baner „Wspieraj lokalnie" */}
        <Skeleton className="mb-8 h-20 w-full rounded-3xl" />

        {/* Pasek okrągłych awatarów relacji */}
        <div className="mb-8 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          ))}
        </div>

        {/* Siatka kart firm */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
