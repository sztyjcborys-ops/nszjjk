import { Skeleton } from "@/components/shared/skeletons"

/**
 * Szkielet MUSI odwzorować układ `app/wydarzenia/page.tsx` (ten sam kontener
 * `max-w-2xl`, ten sam nagłówek `<h1>`, jednokolumnowy `EventsExplorer`).
 * Gdy szkielet ma inną wysokość/szerokość niż finalna treść, podmiana
 * fallbacku Suspense na treść powoduje skok układu, który Firefox koryguje
 * scrollem — i podstrona ląduje kawałek niżej. Zgodność układu = brak skoku.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Wydarzenia</h1>

      <div className="mt-5 md:mt-6">
        {/* Pasek nawigacji miesiąca */}
        <div className="flex items-center gap-1">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto size-9 rounded-xl" />
          <Skeleton className="size-10 rounded-xl" />
        </div>

        {/* Pasek dni tygodnia */}
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.25rem] rounded-2xl" />
          ))}
        </div>

        {/* Lista wydarzeń */}
        <div className="mt-6">
          <Skeleton className="h-6 w-48" />
          <div className="mt-3 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[5.5rem] w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="mt-3 h-[3.25rem] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
