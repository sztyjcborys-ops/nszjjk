import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Hero } from "@/components/home/hero"
import { QuickAccess } from "@/components/home/quick-access"
import { Highlights } from "@/components/home/highlights"
import { WasteAndIdeas } from "@/components/home/waste-and-ideas"
import { LocalSupport } from "@/components/home/local-support"
import { SurveyResults } from "@/components/shared/survey-results"
import { FeaturedPollsCarousel } from "@/components/home/featured-polls-carousel"
import { SectionTitle } from "@/components/shared/section-title"
import { getFeaturedPublicPolls } from "@/lib/polls"

// Publiczna strona główna — cache z rewalidacją w tle (wyróżniona ankieta to
// dane publiczne). Edycje w panelu odświeżają ją natychmiast przez
// revalidatePath('/').
export const revalidate = 300

export default async function HomePage() {
  const featuredPolls = await getFeaturedPublicPolls()
  const featured = featuredPolls[0] ?? null
  const manyPolls = featuredPolls.length > 1
  const surveyTitle = manyPolls
    ? "Zagłosuj w ankietach mieszkańców"
    : featured?.title ?? "Co powinno powstać w Jejkowicach?"
  const surveyDescription = manyPolls
    ? "Przesuwaj strzałkami, aby zobaczyć kolejne ankiety i zdecydować, co dalej w naszej gminie."
    : featured
      ? featured.daysLeft != null
        ? `Zagłosuj i zdecyduj, na co warto przeznaczyć środki gminy. Koniec za ${featured.daysLeft} dni.`
        : "Zagłosuj i zdecyduj, na co warto przeznaczyć środki gminy."
      : "Zagłosuj i zdecyduj, na co warto przeznaczyć środki gminy. Koniec za 5 dni."

  return (
    <div className="flex flex-col gap-14 pb-16 md:gap-20 md:pb-24">
      <Hero />

      <div id="centrum" className="-mt-8 mx-auto w-full max-w-6xl scroll-mt-24 px-4 md:mt-0 md:px-6">
        <SectionTitle
          eyebrow="Centrum mieszkańca"
          title="Wszystko co ważne - w jednym miejscu"
          description="Poznaj najnowsze informacje, wydarzenia i życie lokalnej społeczności"
        />
        <QuickAccess />
      </div>

      <Highlights />

      <LocalSupport />

      <WasteAndIdeas />

      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <SectionTitle
          eyebrow="Ankieta mieszkańców"
          title={surveyTitle}
          description={surveyDescription}
        />
        {featured ? (
          <FeaturedPollsCarousel polls={featuredPolls} />
        ) : (
          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
            <SurveyResults total={342} />
          </div>
        )}
        <div className="mx-auto mt-4 flex w-full max-w-2xl justify-center">
          <Link
            href="/ankiety"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            Zobacz wszystkie ankiety
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
