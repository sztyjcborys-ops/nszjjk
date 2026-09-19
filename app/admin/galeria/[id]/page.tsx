import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getGalleryImageById } from '@/lib/gallery'
import { GalleryForm } from '@/components/admin/gallery-form'

export const metadata: Metadata = {
  title: 'Edytuj zdjęcie — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function EditGalleryImagePage({ params }: Params) {
  const { id } = await params
  const image = await getGalleryImageById(id)
  if (!image) notFound()

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/galeria"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Wróć do galerii
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Edytuj zdjęcie</h1>
      </div>
      <GalleryForm image={image} />
    </div>
  )
}
