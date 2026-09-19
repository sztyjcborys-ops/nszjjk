import Link from 'next/link'
import { Home, ChevronRight, Calendar, Clock, User, ArrowLeft } from 'lucide-react'
import { CategoryBadge } from '@/components/shared/badges'
import { ShareButton } from '@/components/news/share-button'
import { GalleryLightbox } from '@/components/news/gallery-lightbox'
import type { NewsCategory } from '@/lib/data'
import type { ArticleGalleryImage } from '@/lib/articles'

export type ArticleViewProps = {
  title: string
  excerpt?: string
  category: NewsCategory
  coverImage?: string | null
  contentHtml: string
  gallery?: ArticleGalleryImage[]
  date: string
  time?: string
  author?: string
  /** In preview mode links are inert and the share button is disabled. */
  preview?: boolean
}

function Crumb({ href, preview, children }: { href: string; preview?: boolean; children: React.ReactNode }) {
  const className = 'inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80'
  if (preview) return <span className={className}>{children}</span>
  return (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  )
}

export function ArticleView({
  title,
  excerpt,
  category,
  coverImage,
  contentHtml,
  gallery = [],
  date,
  time,
  author = 'UG Jejkowice',
  preview,
}: ArticleViewProps) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      {/* Breadcrumbs */}
      <nav aria-label="Ścieżka nawigacji" className="flex items-center gap-1.5 text-xs md:text-sm">
        <Crumb href="/" preview={preview}>
          <Home className="size-4" />
          <span className="sr-only">Strona główna</span>
        </Crumb>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <Crumb href="/aktualnosci" preview={preview}>
          Aktualności
        </Crumb>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="truncate text-muted-foreground">{title || 'Tytuł artykułu'}</span>
      </nav>

      {/* Hero image */}
      {coverImage ? (
        <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-card md:mt-6 md:rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage || '/placeholder.svg'} alt={title} className="size-full object-cover" />
        </div>
      ) : (
        <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground md:mt-6 md:rounded-3xl">
          Zdjęcie główne pojawi się tutaj
        </div>
      )}

      {/* Category + title */}
      <div className="mt-4 md:mt-7">
        <CategoryBadge category={category} />
        <h1 className="mt-2.5 text-xl font-extrabold leading-tight tracking-tight text-balance text-foreground md:mt-4 md:text-4xl">
          {title || 'Tytuł artykułu'}
        </h1>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground md:mt-4 md:gap-x-5 md:gap-y-2 md:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-4 text-primary" />
          {date}
        </span>
        {time && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-primary" />
            {time}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <User className="size-4 text-primary" />
          {author}
        </span>
      </div>

      {/* Lead / intro */}
      {excerpt && (
        <p className="mt-4 text-pretty text-sm font-semibold leading-relaxed text-foreground md:mt-6 md:text-lg">
          {excerpt}
        </p>
      )}

      {/* Body content */}
      <div className="article-prose mt-4 md:mt-6" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {/* Gallery */}
      {gallery.length > 0 && <GalleryLightbox gallery={gallery} />}

      {/* Footer actions */}
      <div className="mt-10 flex items-center justify-between border-t border-border pt-5 md:mt-12">
        <ShareButton title={title} disabled={preview} />
        {preview ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft className="size-4" />
            Wróć do aktualności
          </span>
        ) : (
          <Link
            href="/aktualnosci"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="size-4" />
            Wróć do aktualności
          </Link>
        )}
      </div>
    </article>
  )
}
