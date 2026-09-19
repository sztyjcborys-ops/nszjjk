import type { Metadata } from "next"
import { IdeasExplorer } from "@/components/ideas/ideas-explorer"
import { getPublicIdeas } from "@/lib/ideas-server"

export const metadata: Metadata = {
  title: "Pomysły dla Jejkowic | Nasza gmina",
  description:
    "Zgłaszaj pomysły na rozwój Jejkowic i głosuj na propozycje innych mieszkańców. Razem decydujemy, co warto zmienić w naszej gminie.",
}

// Publiczne, zatwierdzone pomysły — odświeżamy co 60 s (widok cache'owany).
export const revalidate = 60

export default async function PomyslyPage() {
  const ideas = await getPublicIdeas()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6 md:mb-8">
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary md:text-xs">
          Głos mieszkańców
        </span>
        <h1 className="text-pretty text-2xl font-bold tracking-tight md:text-3xl">Pomysły dla Jejkowic</h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground md:text-base">
          Wspólnie decydujemy, co zmienić w gminie — najpopularniejsze propozycje trafiają do analizy urzędu.
        </p>
      </header>
      <IdeasExplorer initialIdeas={ideas} />
    </div>
  )
}
