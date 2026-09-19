import { PageHeader } from "@/components/shared/page-header"
import { Skeleton } from "@/components/shared/skeletons"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Zgłoszenia mieszkańców"
        title="Co dzieje się w naszej gminie?"
        description="Przeglądaj sprawy zgłoszone przez mieszkańców i śledź ich status. Masz swój problem do zgłoszenia?"
      />
      <div className="mb-8">
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
