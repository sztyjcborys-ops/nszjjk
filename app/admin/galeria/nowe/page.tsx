import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { GalleryForm } from '@/components/admin/gallery-form'

export const metadata: Metadata = {
  title: 'Nowe zdjęcie — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export default function NewGalleryImagePage() {
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
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Nowe zdjęcie</h1>
      </div>
      <GalleryForm />
    </div>
  )
}
