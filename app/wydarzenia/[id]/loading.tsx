import { Skeleton } from "@/components/shared/skeletons"

/**
 * Szkielet odwzorowuje układ `EventView`: baner wydarzenia, tytuł, wiersz
 * meta (data / miejsce) oraz blok opisu. Zgodność szerokości i proporcji
 * ogranicza skok układu przy podmianie fallbacku Suspense na treść.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      {/* Baner */}
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />

      {/* Tytuł */}
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-8 w-10/12" />
        <Skeleton className="h-8 w-1/2" />
      </div>

      {/* Kafelki meta (data, godzina, miejsce) */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>

      {/* Opis */}
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </div>
    </div>
  )
}
