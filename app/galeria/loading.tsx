import { PageHeader } from "@/components/shared/page-header"
import { Skeleton } from "@/components/shared/skeletons"

/**
 * Szkielet odwzorowuje układ `app/galeria/page.tsx` (PageHeader + pasek narzędzi
 * z zakładkami i przyciskiem „Dodaj zdjęcie", potem siatka). Bez paska narzędzi
 * finalna treść była wyższa od szkieletu — podmiana fallbacku powodowała skok
 * układu, na który Firefox reagował scrollem. Zgodność wysokości = brak skoku.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Galeria mieszkańców"
        title="Jejkowice okiem mieszkańców"
        description="Najpiękniejsze kadry z naszej gminy. Podziel się swoim zdjęciem i pokaż Jejkowice z Twojej perspektywy."
      />

      {/* Pasek narzędzi: przycisk „Dodaj swoje zdjęcie" (jak w GalleryGrid) */}
      <div className="mb-6 flex items-center justify-end">
        <Skeleton className="h-10 w-52 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton
            key={i}
            className={i % 5 === 0 ? "row-span-2 aspect-[3/4] w-full rounded-xl" : "aspect-square w-full rounded-xl"}
          />
        ))}
      </div>
    </div>
  )
}
