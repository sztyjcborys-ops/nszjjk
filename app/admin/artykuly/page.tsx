import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { getAllArticles } from '@/lib/articles'
import { ArticlesList, type ArticleVM } from './articles-list'

export const metadata: Metadata = {
  title: 'Artykuły — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ArticlesPage() {
  const articles = await getAllArticles()
  const items: ArticleVM[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    cover_image: a.cover_image,
    published: a.published,
    pinned: a.pinned,
    created_at: a.created_at,
  }))

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Artykuły</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'artykuł' : 'pozycji'} · zarządzaj aktualnościami
          </p>
        </div>
        <Link
          href="/admin/nowy"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nowy artykuł</span>
          <span className="sm:hidden">Nowy</span>
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Brak artykułów</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
            Nie masz jeszcze żadnych aktualności. Dodaj pierwszy artykuł, aby pojawił się na stronie.
          </p>
          <Link
            href="/admin/nowy"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Dodaj artykuł
          </Link>
        </div>
      ) : (
        <ArticlesList articles={items} />
      )}
    </div>
  )
}
