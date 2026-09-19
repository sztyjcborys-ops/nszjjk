import { Skeleton } from "@/components/shared/skeletons"

/**
 * Szkielet odwzorowuje układ `ArticleView` (kontener `max-w-3xl`): okładka,
 * kategoria, tytuł, wiersz meta i akapity treści. Zgodność szerokości i
 * proporcji ogranicza skok układu przy podmianie fallbacku Suspense na treść.
 */
export default function Loading() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      {/* Okładka */}
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />

      {/* Kategoria + tytuł */}
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-11/12" />
        <Skeleton className="h-8 w-3/4" />
      </div>

      {/* Wiersz meta (data / autor) */}
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Akapity treści */}
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </div>
    </article>
  )
}
