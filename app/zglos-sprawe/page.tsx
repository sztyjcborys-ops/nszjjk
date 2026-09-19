import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { ReportForm } from "@/components/report/report-form"
import { getPublicReports } from "@/lib/public-reports"

export const metadata: Metadata = {
  title: "Zgłoś sprawę | Jejkowice — nasza gmina!",
  description:
    "Zgłoś problem w gminie Jejkowice — drogi, oświetlenie, zieleń, odpady. Szybko przekażemy sprawę do odpowiednich służb.",
}

// Publiczna strona z formularzem + sekcją "ostatnie zgłoszenia" (dane publiczne).
// Cache z krótką rewalidacją; akcje admina odświeżają ją natychmiast przez
// revalidatePath('/zglos-sprawe').
export const revalidate = 60

export default async function ZglosSprawePage() {
  const recentReports = await getPublicReports(3)
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Zgłoś sprawę"
        title="Widzisz coś, co wymaga uwagi gminy?"
        description="Zgłoś problem w swojej okolicy, wypełnij poniższy formularz – Twoje zgłoszenie trafi do nas, a my przekażemy go dalej."
      />
      <ReportForm recentReports={recentReports} />
    </div>
  )
}
