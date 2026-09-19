import { PageHeader } from "@/components/shared/page-header"
import { CardSkeleton } from "@/components/shared/skeletons"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Aktualności"
        title="Co nowego w Jejkowicach?"
        description="Bądź na bieżąco z inwestycjami, wydarzeniami i komunikatami z życia naszej gminy."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
