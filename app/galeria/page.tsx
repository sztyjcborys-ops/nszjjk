import type { Metadata } from "next"
import { getPublicGallery } from "@/lib/gallery"
import { GalleryGrid } from "@/components/gallery/gallery-grid"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = {
  title: "Galeria mieszkańców | Jejkowice — nasza gmina!",
  description: "Galeria mieszkańców Jejkowic — najpiękniejsze kadry z naszej gminy nadesłane przez mieszkańców.",
}

// Cache jak na innych podstronach — strona odświeża się co 5 minut (ISR),
// zamiast renderować się od zera przy każdym wejściu. Nowo zaakceptowane
// zdjęcia pojawią się w ciągu do 5 minut.
export const revalidate = 300

export default async function GaleriaPage() {
  const images = await getPublicGallery()

  // Ten sam nagłówek i układ co szkielet w `loading.tsx` — dzięki temu po
  // wczytaniu treści nie ma skoku layoutu ani „podmiany" wersji strony.
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Galeria mieszkańców"
        title="Jejkowice okiem mieszkańców"
        description="Najpiękniejsze kadry z naszej gminy. Podziel się swoim zdjęciem i pokaż Jejkowice z Twojej perspektywy."
      />

      <GalleryGrid images={images} />
    </main>
  )
}
