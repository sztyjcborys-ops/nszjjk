import { PageHeader } from "@/components/shared/page-header"
import { Skeleton } from "@/components/shared/skeletons"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Ankiety i opinie"
        title="Twoja opinia ma znaczenie!"
        description="Bierz udział w ankietach i wpływaj na naszą gminę. Wspólnie decydujmy o tym, co powstanie w Jejkowicach."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
