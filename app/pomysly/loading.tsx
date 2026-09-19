import { Skeleton } from "@/components/shared/skeletons"

/**
 * Szkielet odwzorowuje układ `app/pomysly/page.tsx` (własny nagłówek: plakietka
 * + `<h1>` + opis, ten sam kontener i dwukolumnowa siatka `IdeasExplorer`).
 * Wcześniej używał `PageHeader` z inną wysokością/paddingiem niż finalny nagłówek,
 * przez co podmiana fallbacku powodowała skok układu korygowany scrollem na
 * Firefoksie. Zgodność układu = brak skoku.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6 md:mb-8">
        <Skeleton className="mb-3 h-6 w-40 rounded-full" />
        <Skeleton className="h-9 w-72 max-w-full md:h-11" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-2xl" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-8">
        <Skeleton className="h-96 w-full rounded-3xl" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
