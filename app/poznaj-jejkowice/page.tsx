import type { Metadata } from "next"
import { UnderConstruction } from "@/components/shared/under-construction"

export const metadata: Metadata = {
  title: "Poznaj Jejkowice | Jejkowice — nasza gmina!",
  description: "Poznaj Jejkowice — strona w budowie.",
}

export default function PoznajJejkowicePage() {
  return (
    <UnderConstruction
      eyebrow="Poznaj Jejkowice"
      title="Strona w budowie"
      description="Ta sekcja jest w trakcie przygotowania. Wkrótce znajdziesz tu historię, ciekawostki i najważniejsze informacje o naszej gminie."
    />
  )
}
