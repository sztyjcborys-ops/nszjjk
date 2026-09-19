import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/shared/skeletons'
import { BUDGET_PAGE_ENABLED } from '@/lib/features'

/**
 * Szkielet odwzorowuje układ `app/budzet/page.tsx` (PageHeader + „Aktualny
 * budżet" z kartą podsumowania, potem karty sekcji z wykresami). Zgodność
 * wysokości z finalną treścią ogranicza skok układu przy podmianie fallbacku.
 */
export default function Loading() {
  // Gdy strona budżetu jest ukryta, nie pokazujemy jej szkieletu ładowania —
  // strona i tak zwróci 404, więc fallback nie może zdradzać treści budżetu.
  if (!BUDGET_PAGE_ENABLED) {
    return null
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <PageHeader
        eyebrow="Finanse gminy"
        title="Budżet gminy"
        description="Przejrzysty obraz gminnych finansów — ile mamy, na co idą pieniądze i jak budżet zmieniał się w ciągu roku. Wszystkie dane pochodzą wprost z rejestru budżetowego gminy."
      />

      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <section
            key={i}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-64 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-52 w-full rounded-xl" />
          </section>
        ))}
      </div>
    </div>
  )
}
