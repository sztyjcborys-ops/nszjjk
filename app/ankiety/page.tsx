import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { Surveys } from "@/components/surveys/surveys"
import { getPublicPolls } from "@/lib/polls"
import { getPublicIdeas } from "@/lib/ideas-server"

export const metadata: Metadata = {
  title: "Ankiety i opinie | Jejkowice — nasza gmina!",
  description:
    "Weź udział w ankietach mieszkańców Jejkowic i miej realny wpływ na rozwój naszej gminy.",
}

// Wyniki ankiet zmieniają się częściej — krótka rewalidacja. Głos oddany przez
// mieszkańca i tak odświeża tę stronę natychmiast (revalidatePath('/ankiety')).
export const revalidate = 60

export default async function AnkietyPage() {
  const [polls, ideas] = await Promise.all([getPublicPolls(), getPublicIdeas()])
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Ankiety i opinie"
        title="Twoja opinia ma znaczenie!"
        description="Bierz udział w ankietach i wpływaj na naszą gminę. Wspólnie decydujmy o tym, co powstanie w Jejkowicach."
      />
      <Surveys polls={polls} ideas={ideas} />
    </div>
  )
}
