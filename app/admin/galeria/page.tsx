import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Pencil, Eye, EyeOff, Images } from 'lucide-react'
import { getAdminGallery, getPendingGallery, formatGalleryDate } from '@/lib/gallery'
import { deleteGalleryImageAction, toggleGalleryPublishAction } from './actions'
import { GalleryPending } from '@/components/admin/gallery-pending'
import { GalleryDeleteButton } from '@/components/admin/gallery-delete-button'
import { PendingIconButton } from '@/components/admin/pending-icon-button'
import { GalleryImageViewer } from '@/components/admin/gallery-image-viewer'

export const metadata: Metadata = {
  title: 'Galeria — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminGalleryPage() {
  const [images, pending] = await Promise.all([getAdminGallery(), getPendingGallery()])

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Galeria</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {images.length} {images.length === 1 ? 'zdjęcie' : 'pozycji'} · zdjęcia mieszkańców
          </p>
        </div>
        <Link
          href="/admin/galeria/nowe"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Dodaj zdjęcie</span>
          <span className="sm:hidden">Dodaj</span>
        </Link>
      </div>

      <GalleryPending images={pending} />

      {images.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Images className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Brak zdjęć</h2>
          <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            Dodaj pierwsze zdjęcie, aby pojawiło się w galerii mieszkańców.
          </p>
          <Link
            href="/admin/galeria/nowe"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Dodaj zdjęcie
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <li
              key={img.id}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-sm"
            >
              <GalleryImageViewer
                src={img.src || '/placeholder.svg'}
                alt={img.alt || ''}
                published={img.published}
              />

              <div className="flex flex-col gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={img.alt}>
                    {img.alt || <span className="text-muted-foreground">Bez opisu</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="whitespace-nowrap">{formatGalleryDate(img.created_at)}</span>
                  </p>
                </div>

                <div className="-mr-1 flex items-center justify-end">
                  <form action={toggleGalleryPublishAction}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="next" value={String(!img.published)} />
                    <PendingIconButton
                      aria-label={img.published ? 'Ukryj' : 'Pokaż'}
                      title={img.published ? 'Widoczne — kliknij, aby ukryć' : 'Ukryte — kliknij, aby pokazać'}
                      className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                        img.published
                          ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          : 'text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
                      }`}
                      spinnerClassName={img.published ? undefined : 'text-red-500 dark:text-red-400'}
                    >
                      {img.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </PendingIconButton>
                  </form>
                  <Link
                    href={`/admin/galeria/${img.id}`}
                    aria-label="Edytuj"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <form action={deleteGalleryImageAction}>
                    <input type="hidden" name="id" value={img.id} />
                    <GalleryDeleteButton />
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
