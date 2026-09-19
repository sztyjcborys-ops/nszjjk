import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { WasteSchedule } from "@/components/waste/waste-schedule"

export const metadata: Metadata = {
  title: "Wywóz śmieci | Jejkowice — nasza gmina!",
  description:
    "Harmonogram wywozu odpadów w Jejkowicach, przewodnik segregacji, przypomnienia oraz informacje o PSZOK.",
}

export default function WywozSmieciPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Wywóz śmieci"
        title="Segregujesz? Dziękujemy!"
        description="Sprawdź terminy odbioru, dowiedz się jak prawidłowo segregować i włącz przypomnienia, aby nie przegapić żadnego wywozu."
      />
      <WasteSchedule />
    </div>
  )
}
